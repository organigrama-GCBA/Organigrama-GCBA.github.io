// Pipeline Boletín Oficial CABA -> cambios de organigrama.
//
// 1. Baja el PDF del día (URL predecible del BOCBA).
// 2. Extrae texto y se queda SOLO con los DECRETOS del Poder Ejecutivo
//    (designaciones/ceses de alto nivel y cambios de estructura). Se puede
//    ampliar a todo el boletín con INCLUIR_RESOLUCIONES=1.
// 3. Llama a Claude con salida estructurada (tool use) para extraer una lista
//    de operaciones de cambio contra data/organigrama.json. El organigrama
//    actual se envía en `system` con prompt caching, así se reutiliza entre
//    chunks sin re-cobrar tokens completos.
// 4. Aplica las operaciones a una copia del organigrama, escribe el JSON
//    actualizado y un resumen (audit + cuerpo del PR).
//
// Variables de entorno:
//   ANTHROPIC_API_KEY  (requerida)  - secret del repo
//   FECHA              (opcional)   - YYYY-MM-DD; por defecto, hoy (hora ARG)
//   CLAUDE_MODEL       (opcional)   - id de modelo; por defecto claude-opus-4-8
//                                     (para abaratar: claude-sonnet-4-6)
//   BODY_PATH          (opcional)   - dónde escribir el cuerpo del PR
//   DUMP_TEXT          (opcional)   - si =1, guarda el texto extraído para depurar
//   GITHUB_OUTPUT      (lo setea Actions) - se escribe `changed` y `fecha`

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import Anthropic from "@anthropic-ai/sdk";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// ── Rutas (relativas a la raíz del repo) ───────────────────────────────
const ROOT = process.cwd();
const ORG_PATH = path.join(ROOT, "data", "organigrama.json");
const FUNCIONES_PATH = path.join(ROOT, "data", "funciones.json");

// ── Parámetros ─────────────────────────────────────────────────────────
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";
const MAX_CHUNK_CHARS = 24000;   // ~8k tokens por chunk de boletín
const KEEP_CONTEXT_LINES = 6;    // líneas alrededor de cada coincidencia
// Por defecto SOLO miramos los DECRETOS (Poder Ejecutivo): son los que cambian
// la estructura y designan/cesan funcionarios de alto nivel (SS, DG, organismos).
// Así descartamos el grueso del boletín (resoluciones ministeriales con cargos
// operativos de bajo nivel) → menos ruido y muchísimos menos tokens.
// Poné INCLUIR_RESOLUCIONES=1 para volver a mirar todo el boletín.
const SOLO_DECRETOS = process.env.INCLUIR_RESOLUCIONES !== "1";

// Depuración: con DUMP_TEXT=1 se guarda el texto de cada etapa del pipeline
// (crudo → decretos → relevante → fragmentos → respuesta del modelo). Sirve para
// ver qué se le mandó realmente al modelo cuando dice que no hay cambios.
const DUMP = process.env.DUMP_TEXT === "1";
const DUMP_DIR = process.env.DUMP_DIR || ROOT;
function dump(nombre, contenido) {
  if (!DUMP) return;
  fs.mkdirSync(DUMP_DIR, { recursive: true });
  fs.writeFileSync(path.join(DUMP_DIR, `boletin-${nombre}`), contenido ?? "");
}

// Palabras clave del Poder Ejecutivo que marcan designaciones / ceses /
// cambios de estructura. (BOCBA usa lenguaje jurídico bastante estable.)
const KEYWORDS = [
  "desígnase", "desígnese", "desígnanse", "designa", "designación",
  "acéptase la renuncia", "renuncia", "cese", "césase", "cesa en",
  "límitase", "limítase", "dáse por finalizada",
  "créase", "crease", "suprímese", "suprímese", "disuélvese",
  "modifícase la estructura", "apruébase la estructura",
  "estructura orgánico funcional", "estructura organico funcional",
  "transfiérese", "transfierese", "absorbe", "pasa a depender",
  "dependiente de", "modificación de estructura",
  // Misiones y funciones (para capturar responsabilidades primarias / objetivos)
  "responsabilidad primaria", "responsabilidades primarias",
  "objetivos", "descripción de acciones", "descripcion de acciones",
];

// ── Utilidades de árbol ────────────────────────────────────────────────
function flatten(node, parentId, out) {
  if (!node) return out;
  out.push({ id: node.id, nombre: node.nombre, tipo: node.tipo, titular: node.titular || "", parentId });
  (node.children || []).forEach((c) => flatten(c, node.id, out));
  return out;
}
function findNode(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const c of node.children || []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}
function findParent(node, id, parent = null) {
  if (!node) return null;
  if (node.id === id) return parent;
  for (const c of node.children || []) {
    const f = findParent(c, id, node);
    if (f !== null) return f;
  }
  return null;
}
function genId(base, root) {
  let s = (base || "NODO").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "").slice(0, 12) || "NODO";
  let id = s, n = 1;
  while (findNode(root, id)) id = s + n++;
  return id;
}

// ── 1) Bajar el PDF del boletín ────────────────────────────────────────
function pdfUrl(fecha) {
  const [y, m, d] = fecha.split("-");
  return `https://boletinoficial.buenosaires.gob.ar/documentos/boletines/${y}/${m}/${y}${m}${d}.pdf`;
}
// Un 404 es definitivo: ese día no hay boletín publicado en esa URL. Cualquier
// otra cosa —500, 502, timeout, DNS— es el servidor del BOCBA teniendo un mal
// momento, y reintentar alcanza. El 3/11/2026 quedó sin leer por un 500 que
// nadie reintentó.
const REINTENTOS = 3;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchPdf(url) {
  let ultimo;
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    let res;
    try {
      res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "application/pdf,*/*",
        },
      });
    } catch (e) {
      ultimo = Object.assign(new Error(`No se pudo bajar el boletín (${e.message || "error de red"})`), { status: 0 });
      if (intento < REINTENTOS) { await espera(intento * 5000); continue; }
      throw ultimo;
    }
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const err = Object.assign(new Error(`No se pudo bajar el boletín (${res.status})`), { status: res.status });
    if (res.status === 404) throw err;          // no hay edición: no insistir
    ultimo = err;
    if (intento < REINTENTOS) { await espera(intento * 5000); continue; }
    throw ultimo;
  }
  throw ultimo;
}

// ── 2) Extraer y filtrar texto ─────────────────────────────────────────
// Conserva solo el texto de los DECRETOS. Segmenta el boletín por encabezados
// de norma (DECRETO / RESOLUCIÓN / DISPOSICIÓN…) y se queda con los bloques
// cuyo encabezado es un Decreto. Descarta resoluciones/disposiciones (ruido).
function soloDecretos(texto) {
  const lines = texto.split(/\r?\n/);
  const esHeader = (l) => {
    const s = l.trim();
    if (!/^(DECRETO|RESOLUCI[ÓO]N|RESOLUCION|DISPOSICI[ÓO]N|DISPOSICION)\b/i.test(s)) return false;
    // Un encabezado real es una línea corta (título de la norma) o trae "N.° 123".
    return s.length < 70 || /n\s*[.º°]\s*\d/i.test(s);
  };
  const esDecreto = (l) => /^\s*DECRETO\b/i.test(l);
  const out = [];
  let dentro = false;
  for (const l of lines) {
    if (esHeader(l)) dentro = esDecreto(l);
    if (dentro) out.push(l);
  }
  return out.join("\n");
}
function filtrarRelevante(base) {
  if (!base.trim()) return "";
  const lines = base.split(/\r?\n/);
  const keep = new Array(lines.length).fill(false);
  const low = lines.map((l) => l.toLowerCase());
  for (let i = 0; i < lines.length; i++) {
    if (KEYWORDS.some((k) => low[i].includes(k))) {
      for (let j = Math.max(0, i - KEEP_CONTEXT_LINES); j <= Math.min(lines.length - 1, i + KEEP_CONTEXT_LINES); j++) {
        keep[j] = true;
      }
    }
  }
  const out = [];
  let prev = false;
  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) { out.push(lines[i]); prev = true; }
    else if (prev) { out.push("---"); prev = false; }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function chunkText(t, max) {
  const chunks = [];
  const blocks = t.split(/\n---\n/);
  let cur = "";
  for (const b of blocks) {
    if ((cur + "\n---\n" + b).length > max && cur) { chunks.push(cur); cur = ""; }
    if (b.length > max) { // bloque enorme: cortar duro
      for (let i = 0; i < b.length; i += max) chunks.push(b.slice(i, i + max));
    } else {
      cur = cur ? cur + "\n---\n" + b : b;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// ── 3) Tool / prompt para Claude ───────────────────────────────────────
const INSTRUCCIONES = `Sos un analista jurídico-administrativo del Gobierno de la Ciudad de Buenos Aires (GCBA).
Recibís fragmentos de DECRETOS del Poder Ejecutivo del Boletín Oficial (BOCBA) y un organigrama vigente.
Tu tarea: extraer ÚNICAMENTE los cambios que el texto respalda de forma EXPLÍCITA y que afecten al
organigrama (estructura/titulares) o a las MISIONES Y FUNCIONES (responsabilidades primarias y objetivos) de un área.

FOCO: el organigrama que mantenemos llega hasta el nivel de Dirección General / Gerencia General
y organismos. Te interesan los cambios de ESTRUCTURA (crear/suprimir/transferir/renombrar áreas) y
las designaciones/ceses de funcionarios con rango de Subsecretario, Director General, Gerente General
o titular de organismo descentralizado, y superiores.
IGNORÁ (no devuelvas cambios) para cargos operativos de bajo nivel: Gerencias Operativas,
Subgerencias Operativas, Coordinaciones, cargos "transitorios" de planta, jefaturas de departamento,
subdirecciones de hospital y similares. Esos NO forman parte del organigrama.

SOLO PODER EJECUTIVO. El organigrama es exclusivamente del Poder Ejecutivo de la Ciudad.
IGNORÁ por completo las designaciones de otros poderes y órganos extra-poder, aunque el
decreto las publique: Poder Judicial (jueces, camaristas), Ministerio Público (Fiscal General,
Defensor General, Asesor General y sus adjuntos), Consejo de la Magistratura, Legislatura,
Auditoría General, Defensoría del Pueblo, Ente Único Regulador. Ninguno de esos cargos tiene
lugar en este árbol: si no encontrás un área del Ejecutivo a la que corresponda, la respuesta
correcta es NO devolver el cambio, nunca mapearlo al área más parecida.
El id JG es el Jefe de Gobierno, la raíz del árbol: devolvé un set_titular sobre él
únicamente si el decreto designa o cesa a un Jefe/a de Gobierno. Ante cualquier otra cosa que no
sepas dónde ubicar, omitila.

Tipos de cambio:
- set_titular: una persona es designada como titular de un área existente, o cesa/renuncia (en cuyo caso el titular queda vacío). target_id = id del área. nuevo_titular = nombre y apellido (vacío si es cese sin reemplazo).
- create_node: se crea un área nueva. target_id = id del área de la que DEPENDE. nodo_nuevo = {nombre, tipo, titular}.
- remove_node: se disuelve/suprime un área. target_id = id del área.
- move_node: un área pasa a depender de otra. target_id = id del área que se mueve. nuevo_padre_id = id del nuevo padre.
- rename: cambia el nombre/denominación de un área. target_id = id del área. nuevo_nombre = nombre nuevo.
- set_funciones: el decreto APRUEBA o MODIFICA las "Responsabilidades Primarias" y/o los "Objetivos"
  (misiones y funciones) de un área existente. target_id = id del área. responsabilidad = el texto
  de la responsabilidad primaria; objetivos = el texto de los objetivos/descripción de acciones.
  Transcribí el texto lo más fiel posible (podés unir viñetas en un solo párrafo). Usalo cuando el
  fragmento traiga ese texto (típicamente en un Anexo de "Responsabilidades Primarias, Objetivos y
  Descripción de Acciones"). Si el decreto solo dice "modifícanse las responsabilidades primarias de X"
  SIN incluir el texto nuevo, NO uses set_funciones (no inventes el contenido).

Reglas:
- Usá SOLO los id que aparecen en el organigrama provisto. Si no podés mapear con seguridad un área del boletín a un id existente, NO inventes el id: usá tipo "set_titular"/"rename"/etc. solo cuando el match es claro; si dudás, omití el cambio.
- tipo de área (campo tipo): JG, VJG, MIN, SEC, SS (Subsecretaría), DG (Dir. General), GG, GO, ORG. Inferí el más adecuado.
- Antes de un create_node, buscá el área en el organigrama provisto por su nombre, no solo por su sigla: si ya existe con otra denominación o en otra rama, corresponde rename o move_node, NO crear un duplicado. Dos nodos para la misma área es peor que no registrar el cambio.
- Nombres: respetá la convención del organigrama provisto, que abrevia el rango ("DG. Coordinación Legal", "SS. Emergencia", no "Dirección General Coordinación Legal"). Si renombrás un área, escribí el nombre nuevo con ese mismo estilo.
- "norma": tipo y número, ej "Decreto 123/2026" o "Resolución 45/2026".
- "cita": una frase breve textual del boletín que respalda el cambio.
- "confianza": alta / media / baja según qué tan explícito es el texto.
- Si el fragmento no contiene ningún cambio de organigrama, devolvé una lista vacía.
- No inventes designaciones ni áreas que no estén en el texto.`;

const TOOL = {
  name: "proponer_cambios",
  description: "Registra la lista de cambios de organigrama detectados en el fragmento del boletín.",
  input_schema: {
    type: "object",
    properties: {
      cambios: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["set_titular", "create_node", "remove_node", "move_node", "rename", "set_funciones"] },
            target_id: { type: "string", description: "id del área afectada (o del padre, para create_node)" },
            nuevo_nombre: { type: "string" },
            nuevo_titular: { type: "string" },
            nuevo_padre_id: { type: "string" },
            responsabilidad: { type: "string", description: "set_funciones: texto de la Responsabilidad Primaria del área" },
            objetivos: { type: "string", description: "set_funciones: texto de los Objetivos / Descripción de Acciones del área" },
            nodo_nuevo: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                tipo: { type: "string" },
                titular: { type: "string" },
              },
            },
            norma: { type: "string" },
            fecha: { type: "string" },
            cita: { type: "string" },
            confianza: { type: "string", enum: ["alta", "media", "baja"] },
          },
          required: ["tipo", "target_id", "norma", "cita", "confianza"],
        },
      },
    },
    required: ["cambios"],
  },
};

async function extraerCambios(client, orgContext, chunk) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      { type: "text", text: INSTRUCCIONES },
      // El organigrama es el prefijo estable -> se cachea y se reutiliza entre chunks.
      { type: "text", text: orgContext, cache_control: { type: "ephemeral" } },
    ],
    tools: [TOOL],
    tool_choice: { type: "tool", name: "proponer_cambios" },
    messages: [{ role: "user", content: `Fragmento del Boletín Oficial:\n\n${chunk}` }],
  });
  const u = res.usage || {};
  console.log(`   tokens: in=${u.input_tokens} cache_read=${u.cache_read_input_tokens || 0} cache_write=${u.cache_creation_input_tokens || 0} out=${u.output_tokens}`);
  const block = res.content.find((b) => b.type === "tool_use");
  return block?.input?.cambios || [];
}

// ── 4) Aplicar cambios al árbol (organigrama) y a las funciones ─────────
function aplicar(root, funciones, cambios) {
  const aplicados = [], omitidos = [];
  for (const c of cambios) {
    try {
      // Un cambio que el propio modelo marca como dudoso no se aplica solo: va
      // al informe para que lo mire una persona. Sin este corte, el Decreto
      // 310/2026 —que designa un Fiscal General del Ministerio Público, ajeno
      // al Poder Ejecutivo— se mapeó a JG con confianza baja y habría
      // reemplazado al Jefe de Gobierno en la raíz del árbol.
      if (c.confianza === "baja") throw new Error("confianza baja: requiere revisión manual");
      // La raíz es el Jefe de Gobierno: solo se toca si el decreto lo dice de
      // forma inequívoca. Es el nodo donde un error de mapeo hace más daño.
      if (c.tipo === "set_titular" && c.target_id === root.id && c.confianza !== "alta") {
        throw new Error("cambio de titular en la raíz del organigrama sin confianza alta");
      }
      if (c.tipo === "set_funciones") {
        const n = findNode(root, c.target_id);
        if (!n) throw new Error(`no existe el id ${c.target_id}`);
        const resp = (c.responsabilidad || "").trim();
        const obj = (c.objetivos || "").trim();
        if (!resp && !obj) throw new Error("set_funciones sin responsabilidad ni objetivos");
        const e = funciones[c.target_id] || {};
        if (resp) e.responsabilidad = resp;
        if (obj) e.objetivos = obj;
        e.fuente = c.norma || e.fuente || "";
        funciones[c.target_id] = e;
        aplicados.push(c);
      } else if (c.tipo === "set_titular") {
        const n = findNode(root, c.target_id);
        if (!n) throw new Error(`no existe el id ${c.target_id}`);
        n.titular = (c.nuevo_titular || "").trim();
        aplicados.push(c);
      } else if (c.tipo === "rename") {
        const n = findNode(root, c.target_id);
        if (!n) throw new Error(`no existe el id ${c.target_id}`);
        if (!c.nuevo_nombre) throw new Error("falta nuevo_nombre");
        n.nombre = c.nuevo_nombre.trim();
        aplicados.push(c);
      } else if (c.tipo === "remove_node") {
        const p = findParent(root, c.target_id);
        if (!p) throw new Error(`no existe (o es raíz) el id ${c.target_id}`);
        p.children = (p.children || []).filter((x) => x.id !== c.target_id);
        aplicados.push(c);
      } else if (c.tipo === "move_node") {
        const node = findNode(root, c.target_id);
        const newParent = findNode(root, c.nuevo_padre_id);
        const oldParent = findParent(root, c.target_id);
        if (!node || !newParent || !oldParent) throw new Error("id de nodo o padre inexistente");
        oldParent.children = (oldParent.children || []).filter((x) => x.id !== c.target_id);
        newParent.children = newParent.children || [];
        newParent.children.push(node);
        aplicados.push(c);
      } else if (c.tipo === "create_node") {
        const parent = findNode(root, c.target_id);
        if (!parent) throw new Error(`no existe el padre ${c.target_id}`);
        if (!c.nodo_nuevo?.nombre) throw new Error("falta nodo_nuevo.nombre");
        const nuevo = {
          id: genId(c.nodo_nuevo.nombre, root),
          nombre: c.nodo_nuevo.nombre.trim(),
          tipo: c.nodo_nuevo.tipo || "ORG",
          titular: (c.nodo_nuevo.titular || "").trim(),
          children: [],
        };
        parent.children = parent.children || [];
        parent.children.push(nuevo);
        c._nuevo_id = nuevo.id;
        aplicados.push(c);
      } else {
        throw new Error(`tipo desconocido ${c.tipo}`);
      }
    } catch (e) {
      omitidos.push({ ...c, _motivo: e.message });
    }
  }
  return { aplicados, omitidos };
}

// ── Decretos de estructura ─────────────────────────────────────────────
// El cuerpo de un decreto de estructura no dice qué cambia: remite a anexos
// que se publican como documentos aparte y que el robot no ve. El Decreto
// 355/26 ("Modificar la estructura organizativa de la Vicejefatura de acuerdo
// a lo establecido en los Anexos I - Organigrama y II - Responsabilidades
// Primarias") salió como un set_funciones de confianza baja y quedó en "a
// revisar"; del 306/26, que reestructuró todo el gobierno en 30 anexos, el
// robot solo capturó un renombre suelto. Los dos se terminaron cargando a
// mano semanas después.
//
// No se puede resolver leyendo el boletín del día, pero sí se puede dejar de
// perder: se detecta el decreto, se avisa fuerte y se fuerza un PR aunque no
// haya ningún cambio aplicable, para que quede algo que mirar.
const PATRONES_ESTRUCTURA = [
  /estructura\s+organizativa/i,
  /estructura\s+org[áa]nico[\s-]*funcional/i,
  /apru[ée]ba(?:se|nse)?\s+la\s+estructura/i,
  /modif[íi]ca(?:se|nse|r)?\s+(?:la\s+)?estructura/i,
];
// Número de norma más cercano hacia atrás, que es como aparece en el boletín.
function normaCercana(texto, hasta) {
  const m = [...texto.slice(0, hasta).matchAll(/decreto\s*n?[.°º]*\s*(\d{1,4})\s*[-/]\s*(\d{2,4})/gi)].pop();
  return m ? `Decreto ${m[1]}/${m[2]}` : "decreto sin identificar";
}
function detectarEstructura(fecha, texto) {
  const avisos = [];
  const vistos = new Set();
  for (const pat of PATRONES_ESTRUCTURA) {
    for (const m of texto.matchAll(new RegExp(pat.source, "gi"))) {
      const norma = normaCercana(texto, m.index);
      if (vistos.has(norma)) continue;
      vistos.add(norma);
      const desde = Math.max(0, m.index - 160);
      avisos.push({
        fecha, norma,
        cita: texto.slice(desde, m.index + 240).replace(/\s+/g, " ").trim(),
      });
    }
  }
  return avisos;
}

// ── Resumen (audit + cuerpo del PR) ────────────────────────────────────
function resumen(titulo, fuente, aplicados, omitidos, estructura = []) {
  const linea = (c) => {
    const det = [];
    if (c.tipo === "set_funciones") {
      const r = (c.responsabilidad || "").trim(), o = (c.objetivos || "").trim();
      if (r) det.push(`responsabilidad: "${r.slice(0, 120)}${r.length > 120 ? "…" : ""}"`);
      if (o) det.push(`objetivos: "${o.slice(0, 80)}${o.length > 80 ? "…" : ""}"`);
    }
    if (c.nuevo_titular !== undefined) det.push(`titular: "${c.nuevo_titular}"`);
    if (c.nuevo_nombre) det.push(`nombre: "${c.nuevo_nombre}"`);
    if (c.nuevo_padre_id) det.push(`nuevo padre: ${c.nuevo_padre_id}`);
    if (c._nuevo_id) det.push(`id nuevo: ${c._nuevo_id}`);
    const dia = c._dia ? ` _(${c._dia})_` : "";
    return `- **${c.tipo}** \`${c.target_id}\`${det.length ? " — " + det.join(", ") : ""}${dia}\n  - ${c.norma || "?"} · confianza: ${c.confianza}\n  - _"${(c.cita || "").slice(0, 240)}"_`;
  };
  let md = `# ${titulo}\n\n${fuente}\n\n`;
  if (estructura.length) {
    md += `## ⚠️ Cambios de estructura a procesar a mano (${estructura.length})\n\n`;
    md += `El cuerpo del decreto remite a anexos que no vienen en el boletín del día, así que el robot
no puede saber qué cambió. Hay que bajar los anexos y cargarlos a mano.\n\n`;
    md += estructura.map((e) => `- **${e.norma}** _(${e.fecha})_\n  - _"${e.cita}"_`).join("\n\n");
    md += `\n\n`;
  }
  md += `## Cambios aplicados (${aplicados.length})\n\n`;
  md += aplicados.length ? aplicados.map(linea).join("\n\n") : "_(ninguno)_";
  md += `\n\n## No aplicados / a revisar (${omitidos.length})\n\n`;
  md += omitidos.length
    ? omitidos.map((c) => `- **${c.tipo}** \`${c.target_id}\`${c._dia ? ` _(${c._dia})_` : ""} — ${c._motivo}\n  - ${c.norma || "?"} · _"${(c.cita || "").slice(0, 200)}"_`).join("\n")
    : "_(ninguno)_";
  md += `\n\n---\n\n> Generado automáticamente. Revisá cada cambio contra el Boletín antes de mergear.\n`;
  return md;
}

// ── Procesar un día: fetch + filtro + extracción (no aplica) ────────────
async function procesarDia(client, orgContext, fecha) {
  const url = pdfUrl(fecha);
  let pdf;
  try {
    pdf = await fetchPdf(url);
  } catch (e) {
    // OJO: esto NO es lo mismo que un día sin novedades. Hasta el 17/11/2026
    // devolvía `cambios: []`, igual que un día leído y vacío, así que el job
    // terminaba en verde y el día no leído desaparecía sin que nadie lo viera.
    // Así quedó sin leer el 3/11/2026, que dio 500. Ese resultó no tener
    // cambios, pero se supo después y a mano: el robot no podía decirlo. El
    // día vuelve marcado para que main() lo denuncie.
    console.log(`  ${fecha}: sin boletín (${e.message})`);
    return { fecha, url, cambios: [], sinLeer: { fecha, url, status: e.status ?? 0, motivo: e.message } };
  }
  const { text } = await pdfParse(pdf);
  const decretos = SOLO_DECRETOS ? soloDecretos(text) : text;
  const relevante = filtrarRelevante(decretos);
  // Tamaño de cada etapa. Si el BOCBA cambia el formato del PDF, acá se ve en qué
  // paso se pierde el texto, sin necesidad de DUMP_TEXT.
  console.log(`  ${fecha}: pdf ${pdf.length} B · texto ${text.length} · decretos ${decretos.length} · relevante ${relevante.length} car.`);
  dump(`${fecha}-1-crudo.txt`, text);
  dump(`${fecha}-2-decretos.txt`, decretos);
  dump(`${fecha}-3-relevante.txt`, relevante);
  // Sobre el texto completo de los decretos, no sobre el filtrado: lo que
  // busca es el decreto que remite a anexos, y no depende del modelo.
  const estructura = detectarEstructura(fecha, decretos);
  if (estructura.length) {
    console.log(`  ${fecha}: ⚠️ ${estructura.length} decreto(s) de estructura: ${estructura.map((e) => e.norma).join(", ")}`);
  }
  if (!relevante) {
    console.log(`  ${fecha}: sin secciones relevantes`);
    return { fecha, url, cambios: [], estructura };
  }
  const chunks = chunkText(relevante, MAX_CHUNK_CHARS);
  let cambios = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      dump(`${fecha}-4-frag${i + 1}.txt`, chunks[i]);
      const c = await extraerCambios(client, orgContext, chunks[i]);
      dump(`${fecha}-5-respuesta${i + 1}.json`, JSON.stringify(c, null, 2));
      cambios = cambios.concat(c);
    }
  } catch (e) {
    // El aviso de estructura no depende del modelo: se detectó sobre el texto
    // antes de llamarlo. Si la llamada falla, el aviso tiene que sobrevivir a
    // la excepción o se pierde justo el día que más importa.
    e.estructura = estructura;
    throw e;
  }
  cambios.forEach((c) => { c._dia = fecha; });
  console.log(`  ${fecha}: ${cambios.length} cambio(s) (${chunks.length} frag.)`);
  return { fecha, url, cambios, estructura };
}

// ── Registro de días procesados ────────────────────────────────────────
// El robot anota qué días ya leyó. Sin esto, un día que se pierde se pierde
// para siempre y nadie se entera: el jueves 15/10/2026 quedó sin leer porque
// la ejecución programada directamente no arrancó —GitHub a veces se saltea
// una— y traía el Decreto 360/26. Ningún aviso dentro del script lo podía
// detectar, porque el script no llegó a correr. Con el registro, la corrida
// siguiente ve el agujero y lo levanta sola.
//
// Estados: "leido" (final), "sin-edicion" (404; tras SIN_EDICION_FIRME
// intentos se da por feriado o fin de semana y se deja de insistir) y
// "error" (el servidor falló; se reintenta mientras siga en la ventana).
const REGISTRO_PATH = path.join(ROOT, "data", "boletin-procesados.json");
const VENTANA_DIAS = 14;        // hasta dónde mirar para atrás
const SIN_EDICION_FIRME = 3;    // 404 repetidos que dan el día por cerrado
const MAX_RECUPERAR = 5;        // días atrasados por corrida, para acotar el gasto

function cargarRegistro() {
  try { return JSON.parse(fs.readFileSync(REGISTRO_PATH, "utf8")) || {}; }
  catch { return {}; }
}
function guardarRegistro(reg) {
  const ordenado = Object.fromEntries(Object.entries(reg).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(REGISTRO_PATH, JSON.stringify(ordenado, null, 1) + "\n");
}
function anotar(reg, fecha, estado, extra = {}) {
  const previo = reg[fecha] || {};
  reg[fecha] = {
    estado,
    ...(estado === "leido" ? {} : { intentos: (previo.intentos || 0) + 1 }),
    ...extra,
    visto: new Date().toISOString().slice(0, 10),
  };
}
// Un día cerrado es uno que no tiene sentido volver a pedir.
function cerrado(rec) {
  if (!rec) return false;
  if (rec.estado === "leido") return true;
  return rec.estado === "sin-edicion" && (rec.intentos || 0) >= SIN_EDICION_FIRME;
}
// Días hábiles de la ventana que quedaron sin leer, del más viejo al más nuevo.
function diasPendientes(reg, hasta) {
  const out = [];
  const d = new Date(hasta + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - VENTANA_DIAS);
  for (let i = 0; i < VENTANA_DIAS; i++) {
    const f = d.toISOString().slice(0, 10);
    if (!esFinDeSemana(f) && !cerrado(reg[f])) out.push(f);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// ── Qué día del boletín corresponde procesar ───────────────────────────
const TZ = "America/Argentina/Buenos_Aires";
// Fecha y hora en Buenos Aires, sin depender de la zona horaria de la máquina.
// La versión anterior formateaba la hora argentina en formato estadounidense y
// la volvía a parsear, lo que solo daba bien porque el runner corre en UTC.
function enBuenosAires(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]),
  );
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour), minuto: Number(p.minute) };
}

// El cron está puesto a media tarde, pero GitHub demora las ejecuciones
// programadas: las corridas de octubre de 2026 arrancaron entre una y seis
// horas tarde. Una demora que cruce la medianoche argentina haría pedir el
// boletín del día siguiente, que todavía no existe, y el del día programado no
// se procesaría nunca. Si la corrida cae de madrugada, es una corrida atrasada
// del día anterior.
const HORA_CORTE = 6;
function fechaDeHoy() {
  const { fecha, hora } = enBuenosAires();
  if (hora >= HORA_CORTE) return fecha;
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const ayer = d.toISOString().slice(0, 10);
  console.log(`Son las ${String(hora).padStart(2, "0")}h en Buenos Aires: corrida atrasada, se procesa ${ayer} y no ${fecha}.`);
  return ayer;
}

// Lista de fechas YYYY-MM-DD entre desde y hasta (inclusive).
function diasEntre(desde, hasta) {
  const out = [];
  let d = new Date(desde + "T00:00:00Z");
  const fin = new Date(hasta + "T00:00:00Z");
  while (d <= fin) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

// ── Main ───────────────────────────────────────────────────────────────
// Un día hábil que no se pudo leer es un agujero en el organigrama: puede
// haber salido un decreto y no lo vio nadie. Se denuncia en el log con las
// anotaciones de Actions y se deja en las salidas del paso, para que el
// workflow pueda terminar en rojo en vez de en verde.
const esFinDeSemana = (fecha) => {
  const d = new Date(fecha + "T12:00:00Z").getUTCDay();
  return d === 0 || d === 6;
};
function reportarSinLeer(sinLeer) {
  setOutput("sin_leer", sinLeer.map((s) => s.fecha).join(","));
  // Un 404 de sábado o domingo es lo esperable: ese día no hay edición.
  const sospechosos = sinLeer.filter((s) => !(s.status === 404 && esFinDeSemana(s.fecha)));
  setOutput("sin_leer_grave", sospechosos.filter((s) => s.status !== 404).map((s) => s.fecha).join(","));
  if (!sospechosos.length) return;
  console.log(`\n⚠️  ${sospechosos.length} día(s) hábil(es) que NO se pudieron leer:`);
  for (const s of sospechosos) {
    const nivel = s.status === 404 ? "warning" : "error";
    console.log(`::${nivel}::Boletín ${s.fecha} NO leído — ${s.motivo}. Si ese día salió un decreto de estructura, no entró al organigrama.`);
  }
  console.log("Reprocesalos a mano con el workflow (desde/hasta) cuando el BOCBA vuelva a responder.");
}

function setOutput(k, v) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}

async function main() {
  const DESDE = (process.env.DESDE || "").trim();
  const HASTA = (process.env.HASTA || "").trim();
  const backfill = DESDE && HASTA;

  // Organigrama actual como contexto (estable -> se cachea entre llamadas)
  const root = JSON.parse(fs.readFileSync(ORG_PATH, "utf8"));
  // Misiones y funciones actuales (se actualizan con set_funciones)
  let funciones = {};
  try { funciones = JSON.parse(fs.readFileSync(FUNCIONES_PATH, "utf8")) || {}; } catch { funciones = {}; }
  const flat = flatten(root, null, []);
  const orgContext =
    "Organigrama vigente (id | tipo | nombre | titular | depende_de):\n" +
    flat.map((n) => `${n.id} | ${n.tipo} | ${n.nombre} | ${n.titular} | ${n.parentId || "-"}`).join("\n");

  const client = new Anthropic(); // usa ANTHROPIC_API_KEY

  let tag, titulo, fuente, cambios = [];
  const sinLeer = [];   // días que no se pudieron bajar: no son días vacíos
  const estructura = []; // decretos de estructura: el detalle vive en anexos
  const registro = cargarRegistro();
  // Anota en el registro cómo le fue a un día ya procesado.
  const registrar = (fecha, r) => {
    if (!r.sinLeer) return anotar(registro, fecha, "leido", { cambios: r.cambios.length });
    anotar(registro, fecha, r.sinLeer.status === 404 ? "sin-edicion" : "error", { status: r.sinLeer.status });
  };

  // Detecta errores de API por los que NO tiene sentido seguir llamando.
  const esFatal = (e) => /usage limit|rate limit|overloaded|401|403|authentication|x-api-key|credit balance|insufficient/i.test(String(e?.message || e));

  if (backfill) {
    const dias = diasEntre(DESDE, HASTA);
    tag = `backfill-${DESDE}_${HASTA}`;
    setOutput("fecha", tag);
    console.log(`Backfill ${DESDE} → ${HASTA} (${dias.length} días) con ${MODEL}…`);
    let parcial = false, ultimo = null;
    for (const dia of dias) {
      try {
        const r = await procesarDia(client, orgContext, dia);
        registrar(dia, r);
        if (r.sinLeer) sinLeer.push(r.sinLeer);
        if (r.estructura) estructura.push(...r.estructura);
        cambios = cambios.concat(r.cambios); // orden cronológico
        ultimo = dia;
      } catch (e) {
        console.error(`  ${dia}: ERROR ${String(e?.message || e)}`);
        if (e?.estructura) estructura.push(...e.estructura);
        anotar(registro, dia, "error", { motivo: String(e?.message || e).slice(0, 120) });
        if (esFatal(e)) {
          console.error("⛔ Error de API (límite/credenciales). Corto el backfill y guardo lo recolectado.");
          parcial = true;
          break;
        }
        // error no-fatal (ej. PDF roto) -> seguir con el próximo día
      }
    }
    titulo = `Backfill del Boletín — ${DESDE} a ${HASTA}` + (parcial ? ` (PARCIAL, hasta ${ultimo || "—"})` : "");
    fuente = `Procesados ${dias.length} días${parcial ? ` (cortado por error de API en ${ultimo || "el inicio"})` : ""}. Cambios aplicados en orden cronológico (los más nuevos pisan a los más viejos).`;
  } else {
    const hoy = (process.env.FECHA || "").trim() || fechaDeHoy();
    // Primero los atrasados: los días hábiles de la ventana que el registro
    // no da por leídos. Así un día que se perdió —porque la corrida no
    // arrancó o porque el BOCBA no respondía— lo levanta la corrida
    // siguiente, en vez de quedar afuera para siempre.
    const atrasados = diasPendientes(registro, hoy).filter((d) => d !== hoy).slice(0, MAX_RECUPERAR);
    if (atrasados.length) console.log(`Días atrasados a recuperar: ${atrasados.join(", ")}`);
    const dias = [...atrasados, hoy];
    tag = hoy;
    setOutput("fecha", hoy);
    console.log(`Boletín ${hoy} con ${MODEL}…`);
    let urlHoy = pdfUrl(hoy);   // por si el día falla: el informe igual dice de dónde salía
    for (const dia of dias) {
      try {
        const r = await procesarDia(client, orgContext, dia);
        registrar(dia, r);
        if (r.sinLeer) sinLeer.push(r.sinLeer);
        if (r.estructura) estructura.push(...r.estructura);
        cambios = cambios.concat(r.cambios);   // orden cronológico
      } catch (e) {
        console.error(`  ${dia}: ERROR ${String(e?.message || e)}`);
        if (e?.estructura) estructura.push(...e.estructura);
        anotar(registro, dia, "error", { motivo: String(e?.message || e).slice(0, 120) });
        if (esFatal(e)) {
          console.error("⛔ Error de API (límite/credenciales). Corto y guardo lo recolectado.");
          break;
        }
      }
    }
    titulo = atrasados.length
      ? `Cambios del Boletín Oficial — ${hoy} y ${atrasados.length} día(s) atrasado(s)`
      : `Cambios del Boletín Oficial — ${hoy}`;
    fuente = atrasados.length ? `Días procesados: ${dias.join(", ")}.` : `Fuente: ${urlHoy}`;
  }

  // Antes del corte por "sin cambios": si no se denuncia acá, un día no leído
  // se va por ese return y el job termina en verde sin que nadie se entere.
  reportarSinLeer(sinLeer);
  // Antes de cualquier return: el registro vale aunque el día no traiga nada,
  // porque lo que anota es que el día SE LEYÓ.
  guardarRegistro(registro);

  // Un decreto de estructura casi nunca trae cambios aplicables —el detalle
  // está en los anexos—, así que si el corte de abajo fuera solo por
  // `cambios` se iría por ahí sin dejar rastro. Se avisa y se fuerza el PR.
  setOutput("estructura", estructura.length);
  if (estructura.length) {
    console.log(`\n⚠️  ${estructura.length} decreto(s) de estructura: el detalle está en anexos que el robot no ve.`);
    for (const e of estructura) {
      console.log(`::warning::${e.norma} (${e.fecha}) cambia una estructura organizativa. Hay que bajar los anexos y cargarlo a mano.`);
    }
  }

  console.log(`Cambios propuestos por el modelo: ${cambios.length}`);
  if (!cambios.length && !estructura.length) { setOutput("changed", "false"); console.log("Sin cambios."); return; }

  const { aplicados, omitidos } = aplicar(root, funciones, cambios);
  const md = resumen(titulo, fuente, aplicados, omitidos, estructura);

  // Resumen de auditoría versionado
  const auditDir = path.join(ROOT, "data", "boletin");
  fs.mkdirSync(auditDir, { recursive: true });
  fs.writeFileSync(path.join(auditDir, `${tag}.md`), md);
  // Cuerpo del PR (fuera del repo, no se commitea)
  if (process.env.BODY_PATH) fs.writeFileSync(process.env.BODY_PATH, md);

  const huboFunciones = aplicados.some((c) => c.tipo === "set_funciones");
  const huboArbol = aplicados.some((c) => c.tipo !== "set_funciones");
  if (huboArbol) {
    fs.writeFileSync(ORG_PATH, JSON.stringify(root, null, 2) + "\n");
  }
  if (huboFunciones) {
    fs.writeFileSync(FUNCIONES_PATH, JSON.stringify(funciones, null, 1) + "\n");
  }
  console.log(`Aplicados: ${aplicados.length} (funciones: ${aplicados.filter((c)=>c.tipo==="set_funciones").length}) · A revisar: ${omitidos.length}`);
  for (const c of omitidos) {
    console.log(`::warning::No aplicado — ${c.tipo} ${c.target_id} (${c.norma || "?"}): ${c._motivo}`);
  }
  setOutput("aplicados", aplicados.length);
  setOutput("omitidos", omitidos.length);
  // Los omitidos también cuentan como "hay algo que mostrar": si solo seguimos
  // cuando hay aplicados, un cambio que el modelo detecta pero no se puede
  // aplicar solo (típicamente una reestructuración cuyo contenido vive en un
  // Anexo aparte, fuera del PDF del boletín) desaparece sin dejar rastro: el
  // informe se escribe en el runner y se descarta con él. El PR con el informe
  // es justamente lo que avisa que hay que mirarlo a mano.
  setOutput("changed", (aplicados.length || omitidos.length || estructura.length) ? "true" : "false");
}

main().catch((e) => { console.error(e); process.exit(1); });
