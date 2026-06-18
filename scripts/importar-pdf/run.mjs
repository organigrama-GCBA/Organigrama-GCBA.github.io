// Reconstruye data/organigrama.json desde las imágenes de un PDF de organigrama.
//
// El workflow renderiza cada página del PDF a PNG (pdftoppm) en PAGES_DIR.
// Este script manda cada página a Claude (visión) con salida estructurada
// (tool use) para leer TODAS las cajas: sigla (id), nombre, titular, tipo,
// si es "fuera de nivel" (línea punteada) y de quién depende (siguiendo las
// LÍNEAS). Después ensambla el árbol y escribe data/organigrama.json + un
// reporte con dudas (colisiones de sigla, huérfanos) para revisar en el PR.
//
// Env:
//   ANTHROPIC_API_KEY (requerida)
//   PAGES_DIR         (requerida)  carpeta con pg-01.png, pg-02.png, ...
//   CLAUDE_MODEL      (opcional)   default claude-opus-4-8 (mejor para leer líneas)
//   GITHUB_OUTPUT     (Actions)    escribe `changed`

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = process.cwd();
const ORG_PATH = path.join(ROOT, "data", "organigrama.json");
const REPORT_PATH = path.join(ROOT, "docs", "import-report.md");
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";
const PAGES_DIR = process.env.PAGES_DIR || "/tmp/org";

// Siglas del PDF que mapeamos a los ids ya usados en la app (continuidad).
const ALIAS = { AJG: "JG", AVJG: "VJG" };
const alias = (id) => ALIAS[(id || "").trim()] || (id || "").trim();
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

const INSTRUCCIONES = `Sos un lector experto de organigramas del Gobierno de la Ciudad de Buenos Aires (GCBA).
Te paso UNA página de un organigrama (imagen). Leé TODAS las cajas.

Cada caja tiene tres partes:
- Arriba: el NOMBRE del área (ej. "Ministerio de Justicia", "DG. Asuntos Penales").
- Una franja oscura con la SIGLA / código corto (ej. MJGC, DGTALPG, SSGCOM). Esa sigla es el id.
- Abajo: el TITULAR (nombre y apellido de la persona). Puede estar vacío.

Reglas CRÍTICAS:
- La JERARQUÍA se determina SIGUIENDO LAS LÍNEAS, no por cercanía visual. parent_id =
  la sigla de la caja de la que SALE la línea hacia esta caja.
- La caja de más arriba de la página es la raíz: parent_id vacío.
- Las cajas conectadas con LÍNEA PUNTEADA (no continua) son "fuera de nivel": dashed=true.
- Transcribí la sigla EXACTA (puede tener mayúsculas y números). Si una sigla es ilegible,
  ponela lo más aproximada posible.
- tipo: JG (Jefe de Gobierno), VJG (Vicejefatura), MIN (Ministerio), SEC (Secretaría),
  SS (Subsecretaría), DG (Dirección General), GG (Gerencia General), GO (Gerencia Operativa),
  ORG (organismo/unidad/consejo), OTRO. Inferí por el nombre y el color.
- Devolvé TODAS las cajas de la página con la herramienta, sin omitir ninguna.`;

const TOOL = {
  name: "extraer_organigrama",
  description: "Registra todas las cajas (áreas) leídas en esta página del organigrama.",
  input_schema: {
    type: "object",
    properties: {
      nodos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Sigla/código de la franja oscura. Es el identificador." },
            nombre: { type: "string" },
            tipo: { type: "string", enum: ["JG", "VJG", "MIN", "SEC", "SS", "DG", "GG", "GO", "ORG", "OTRO"] },
            titular: { type: "string", description: "Nombre del titular (vacío si no hay)." },
            dashed: { type: "boolean", description: "true si la caja se conecta con LÍNEA PUNTEADA (fuera de nivel)." },
            parent_id: { type: "string", description: "Sigla de la caja de la que depende (por las líneas). Vacío si es la raíz de la página." },
          },
          required: ["id", "nombre", "parent_id"],
        },
      },
    },
    required: ["nodos"],
  },
};

async function leerPagina(client, file) {
  const b64 = fs.readFileSync(file).toString("base64");
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: INSTRUCCIONES,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "extraer_organigrama" },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: b64 } },
        { type: "text", text: "Leé esta página y devolvé todas las cajas con la herramienta." },
      ],
    }],
  });
  const u = res.usage || {};
  console.log(`   ${path.basename(file)}: tokens in=${u.input_tokens} out=${u.output_tokens}`);
  const block = res.content.find((b) => b.type === "tool_use");
  return block?.input?.nodos || [];
}

async function main() {
  const files = fs.readdirSync(PAGES_DIR).filter((f) => /\.png$/i.test(f)).sort();
  if (!files.length) { console.error("No hay PNGs en " + PAGES_DIR); process.exit(1); }
  console.log(`Procesando ${files.length} páginas con ${MODEL}…`);

  const client = new Anthropic();
  const nodos = {};            // id -> {id,nombre,tipo,titular,dashed,parent}
  const colisiones = [];

  for (const f of files) {
    let lista = [];
    try {
      lista = await leerPagina(client, path.join(PAGES_DIR, f));
    } catch (e) {
      console.error(`   ${f}: ERROR ${String(e?.message || e)}`);
      if (/usage limit|rate limit|overloaded|401|403|authentication|credit/i.test(String(e?.message || e))) {
        console.error("⛔ Error de API — corto y guardo lo que haya.");
        break;
      }
      continue;
    }
    for (const n of lista) {
      const id = alias(n.id);
      if (!id) continue;
      const pid = n.parent_id ? alias(n.parent_id) : "";
      if (nodos[id]) {
        const ex = nodos[id];
        if (ex.nombre && n.nombre && norm(ex.nombre) !== norm(n.nombre)) {
          // misma sigla, distinto nombre -> colisión: id alternativo
          let alt = id + "_2", k = 2;
          while (nodos[alt]) alt = id + "_" + (++k);
          colisiones.push({ id, alt, a: ex.nombre, b: n.nombre, pagina: f });
          nodos[alt] = { id: alt, nombre: n.nombre, tipo: n.tipo || "OTRO", titular: n.titular || "", dashed: !!n.dashed, parent: pid };
        } else {
          if (!ex.titular && n.titular) ex.titular = n.titular;
          if (!ex.tipo && n.tipo) ex.tipo = n.tipo;
          ex.dashed = ex.dashed || !!n.dashed;
          if (!ex.parent && pid) ex.parent = pid; // page 1 ya fijó el padre de los tope
        }
      } else {
        nodos[id] = { id, nombre: n.nombre || id, tipo: n.tipo || "OTRO", titular: n.titular || "", dashed: !!n.dashed, parent: pid };
      }
    }
  }

  // ── Ensamblar árbol ──
  const ids = Object.keys(nodos);
  // raíz: JG, o el primer nodo sin parent
  let rootId = nodos["JG"] ? "JG" : (ids.find((id) => !nodos[id].parent) || ids[0]);
  const huerfanos = [];
  for (const id of ids) {
    const n = nodos[id];
    n.children = [];
  }
  for (const id of ids) {
    if (id === rootId) continue;
    const n = nodos[id];
    let p = n.parent && nodos[n.parent] ? n.parent : null;
    if (!p) { huerfanos.push(id); p = rootId; }   // sin padre válido -> cuelga de la raíz (a revisar)
    nodos[p].children.push(n);
  }
  // limpiar campos internos
  function limpiar(n) {
    const o = { id: n.id, nombre: n.nombre, titular: n.titular || "", tipo: n.tipo || "OTRO" };
    if (n.dashed) o.dashed = true;
    o.children = n.children.map(limpiar);
    return o;
  }
  const tree = limpiar(nodos[rootId]);

  fs.writeFileSync(ORG_PATH, JSON.stringify(tree, null, 2) + "\n");

  // ── Reporte ──
  let cuenta = 0; (function c(x){cuenta++;(x.children||[]).forEach(c);})(tree);
  let md = `# Importación del organigrama desde PDF\n\n`;
  md += `Modelo: ${MODEL} · Páginas: ${files.length} · Nodos resultantes: ${cuenta}\n\n`;
  md += `## A revisar\n\n`;
  md += `### Colisiones de sigla (misma sigla, distinto nombre) — ${colisiones.length}\n\n`;
  md += colisiones.length
    ? colisiones.map((c) => `- \`${c.id}\` en ${c.pagina}: "${c.a}" vs "${c.b}" → al segundo le puse \`${c.alt}\` (corregí la sigla a mano).`).join("\n")
    : "_(ninguna)_";
  md += `\n\n### Huérfanos (sin padre claro, colgados de la raíz) — ${huerfanos.length}\n\n`;
  md += huerfanos.length ? huerfanos.map((id) => `- \`${id}\` (${nodos[id].nombre})`).join("\n") : "_(ninguno)_";
  md += `\n\n---\n\n> Reconstruido automáticamente desde docs/Organigrama_GCBA_2026.pdf. Revisá jerarquía y siglas contra el PDF antes de mergear.\n`;
  fs.writeFileSync(REPORT_PATH, md);

  console.log(`Listo: ${cuenta} nodos · colisiones ${colisiones.length} · huérfanos ${huerfanos.length}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=true\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
