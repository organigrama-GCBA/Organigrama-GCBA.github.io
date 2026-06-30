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
async function fetchPdf(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "application/pdf,*/*",
    },
  });
  if (!res.ok) throw new Error(`No se pudo bajar el boletín (${res.status}) desde ${url}`);
  return Buffer.from(await res.arrayBuffer());
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
function filtrarRelevante(texto) {
  const base = SOLO_DECRETOS ? soloDecretos(texto) : texto;
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

// ── Resumen (audit + cuerpo del PR) ────────────────────────────────────
function resumen(titulo, fuente, aplicados, omitidos) {
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
    console.log(`  ${fecha}: sin boletín (${e.message.split(" desde ")[0]})`);
    return { fecha, url, cambios: [] };
  }
  const { text } = await pdfParse(pdf);
  const relevante = filtrarRelevante(text);
  if (!relevante) {
    console.log(`  ${fecha}: sin secciones relevantes`);
    return { fecha, url, cambios: [] };
  }
  const chunks = chunkText(relevante, MAX_CHUNK_CHARS);
  let cambios = [];
  for (let i = 0; i < chunks.length; i++) {
    cambios = cambios.concat(await extraerCambios(client, orgContext, chunks[i]));
  }
  cambios.forEach((c) => { c._dia = fecha; });
  console.log(`  ${fecha}: ${cambios.length} cambio(s) (${chunks.length} frag.)`);
  return { fecha, url, cambios };
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
        cambios = cambios.concat(r.cambios); // orden cronológico
        ultimo = dia;
      } catch (e) {
        console.error(`  ${dia}: ERROR ${String(e?.message || e)}`);
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
    const fecha = (process.env.FECHA || "").trim() ||
      new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
        .toISOString().slice(0, 10);
    tag = fecha;
    setOutput("fecha", fecha);
    console.log(`Boletín ${fecha} con ${MODEL}…`);
    const r = await procesarDia(client, orgContext, fecha);
    cambios = r.cambios;
    titulo = `Cambios del Boletín Oficial — ${fecha}`;
    fuente = `Fuente: ${r.url}`;
  }

  console.log(`Cambios propuestos por el modelo: ${cambios.length}`);
  if (!cambios.length) { setOutput("changed", "false"); console.log("Sin cambios."); return; }

  const { aplicados, omitidos } = aplicar(root, funciones, cambios);
  const md = resumen(titulo, fuente, aplicados, omitidos);

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
  setOutput("changed", aplicados.length ? "true" : "false");
}

main().catch((e) => { console.error(e); process.exit(1); });
