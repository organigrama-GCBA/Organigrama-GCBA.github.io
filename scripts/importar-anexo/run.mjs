// Anexo de "Responsabilidades Primarias, Objetivos y Descripción de Acciones"
// -> organigrama + funciones.
//
// Estos anexos traen el árbol codificado en la numeración de los títulos
// (1.1, 1.1.1, 1.1.3.1…) y el tipo de área en el prefijo del título
// ("DIRECCIÓN GENERAL …", "SUBSECRETARÍA …"). Eso se parsea sin modelo: es
// determinístico, barato y revisable. El PDF del diagrama (el otro anexo) NO
// sirve como fuente: ahí la jerarquía está en las líneas entre cajas.
//
// Por defecto NO escribe nada: genera el informe de diferencias para revisar.
// Con APLICAR=1 escribe data/organigrama.json y data/funciones.json.
//
// Variables de entorno:
//   ANEXO    (requerida) - ruta al PDF del anexo de responsabilidades
//   RAIZ     (requerida) - id de la jurisdicción destino (ej. VJG), tal como
//                          figura en data/organigrama.json
//   NORMA    (opcional)  - ej. "Decreto 306/2026"; queda asentado en funciones
//   FECHA    (opcional)  - YYYY-MM-DD, para nombrar el informe
//   APLICAR  (opcional)  - =1 para escribir los JSON; si no, solo informe
//   OUT      (opcional)  - ruta del informe (default docs/anexos/<fecha>-<raiz>.md)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const ORG_PATH = path.join(ROOT, "data", "organigrama.json");
const FUNCIONES_PATH = path.join(ROOT, "data", "funciones.json");

const ANEXO = process.env.ANEXO;
const RAIZ = (process.env.RAIZ || "").trim();
const NORMA = (process.env.NORMA || "").trim();
const FECHA = (process.env.FECHA || "").trim() || new Date().toISOString().slice(0, 10);
const APLICAR = process.env.APLICAR === "1";

if (!ANEXO || !RAIZ) {
  console.error("Faltan ANEXO (ruta al PDF) y/o RAIZ (id de la jurisdicción).");
  process.exit(1);
}

// Niveles que el organigrama sigue. Gerencias y Subgerencias Operativas quedan
// fuera por decisión del proyecto: no forman parte de este árbol.
const PREFIJOS = [
  ["SUBGERENCIA OPERATIVA", "SGO"],
  ["GERENCIA OPERATIVA", "GO"],
  ["DIRECCIÓN GENERAL", "DG"],
  ["DIRECCION GENERAL", "DG"],
  ["SUBSECRETARÍA", "SS"],
  ["SUBSECRETARIA", "SS"],
  ["SECRETARÍA", "SEC"],
  ["SECRETARIA", "SEC"],
  ["MINISTERIO", "MIN"],
  ["GERENCIA GENERAL", "GG"],
  ["FUERA DE NIVEL", "ORG"],
  ["ORGANISMO FUERA DE NIVEL", "ORG"],
];
const SIGUE = new Set(["SEC", "SS", "DG", "GG", "ORG", "MIN"]);
const ABREV = { DG: "DG.", SS: "SS.", SEC: "SEC.", GG: "GG.", MIN: "", ORG: "" };

// ── Texto del PDF ──────────────────────────────────────────────────────
function textoDe(pdf) {
  try {
    return execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
  } catch (e) {
    console.error("No se pudo ejecutar pdftotext (instalá poppler-utils):", e.message);
    process.exit(1);
  }
}

// Pies de página de GEDO que ensucian el cuerpo de cada sección.
const RUIDO = /^\s*(IF-\d{4}-\d+-GCABA-\w+|Página\s+\d+\s+de\s+\d+)\s*$/i;

// ── Parseo de títulos numerados ────────────────────────────────────────
// El punto final del número es opcional: el anexo alterna "1.3 DIRECCIÓN…" con
// "2. SUBSECRETARÍA…". Exigir espacio justo después del número descartaba estas
// últimas, y entonces sus hijas quedaban huérfanas y se colgaban de la raíz, lo
// que se leía como una mudanza que nunca ocurrió.
const RE_TITULO = /^\s*(\d+(?:\.\d+)*)\.?\s+([A-ZÁÉÍÓÚÑ].*)$/;
// Continuación de un título largo: línea indentada, en mayúsculas, sin numerar.
// La sangría de estas líneas no es fija (vimos de 3 espacios en adelante), y
// perderlas corta el nombre justo donde suele estar la sigla: el título de
// COPIDIS termina en "(COPIDIS) - LEY 447" en la segunda línea.
const RE_CONT = /^\s{2,}[A-ZÁÉÍÓÚÑ0-9(][A-ZÁÉÍÓÚÑ0-9 ,.\-()/°º]*$/;

function tipoY(nombre) {
  for (const [p, t] of PREFIJOS) {
    if (nombre.startsWith(p)) return [t, nombre.slice(p.length).replace(/^[\s\-–]+/, "").trim()];
  }
  return ["?", nombre];
}

function parsear(texto) {
  const lineas = texto.split(/\r?\n/);
  const crudos = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = RE_TITULO.exec(lineas[i]);
    if (!m) continue;
    let titulo = m[2].trim();
    let j = i + 1;
    while (j < lineas.length && RE_CONT.test(lineas[j]) && lineas[j].trim().length > 3) {
      titulo += " " + lineas[j].trim();
      j++;
    }
    crudos.push({ num: m[1], titulo: titulo.replace(/\s+/g, " "), desde: j, hasta: -1 });
  }
  for (let i = 0; i < crudos.length; i++) {
    crudos[i].hasta = i + 1 < crudos.length ? crudos[i + 1].desde - 1 : lineas.length;
  }
  return crudos.map((c) => {
    const [tipo, nombre] = tipoY(c.titulo);
    const cuerpo = lineas.slice(c.desde, c.hasta).filter((l) => !RUIDO.test(l));
    return { num: c.num, nivel: c.num.split(".").length, tipo, nombre, ...secciones(cuerpo) };
  });
}

// "Objetivos" / "Responsabilidad Primaria" / "Descripción de Acciones"
function secciones(lineas) {
  const etiqueta = (l) => {
    const s = l.trim().toLowerCase().replace(/\s+/g, " ");
    if (/^responsabilidad(es)? primaria/.test(s)) return "responsabilidad";
    if (/^objetivos?$/.test(s)) return "objetivos";
    if (/^descripci[óo]n de acciones$/.test(s)) return "objetivos";
    return null;
  };
  const out = { responsabilidad: [], objetivos: [] };
  let actual = null;
  for (const l of lineas) {
    const e = etiqueta(l);
    if (e) { actual = e; continue; }
    if (actual && l.trim()) out[actual].push(l.trim());
  }
  const unir = (a) => a.join(" ").replace(/\s+/g, " ").trim();
  return { responsabilidad: unir(out.responsabilidad), objetivos: unir(out.objetivos) };
}

// Arma el árbol por profundidad de numeración y luego cuelga cada área del
// ancestro más cercano que el organigrama sí sigue (saltea GO/SGO).
function arbolDelAnexo(items) {
  const porNum = new Map(items.map((i) => [i.num, i]));
  const padreDe = (num) => {
    const partes = num.split(".");
    for (let k = partes.length - 1; k > 0; k--) {
      const cand = porNum.get(partes.slice(0, k).join("."));
      if (cand && SIGUE.has(cand.tipo)) return cand;
      if (cand) continue;
    }
    return null;
  };
  return items.filter((i) => SIGUE.has(i.tipo)).map((i) => ({ ...i, padre: padreDe(i.num) }));
}

// ── Árbol del repo ─────────────────────────────────────────────────────
// El anexo y el repo escriben la misma área distinto: "C.A.B.A." vs "CABA",
// "Ley N° 2.628" vs "LEY 2.628", "DG. Dirección General Comunicación" vs
// "COMUNICACIÓN". Comparar cadenas enteras da falsos negativos y termina
// creando duplicados, así que se compara por conjunto de palabras con peso.
const VACIAS = new Set([
  "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E", "PARA", "EN", "A", "CON", "POR",
  "DG", "SS", "SEC", "GG", "MIN", "DIRECCION", "GENERAL", "SUBSECRETARIA",
  "SECRETARIA", "MINISTERIO", "FUERA", "NIVEL", "N", "NRO", "NO",
]);
function limpio(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/\b(?:[A-Z]\.){2,}/g, (m) => m.replace(/\./g, ""))  // C.A.B.A. -> CABA
    .replace(/N[°º]/g, " ")
    .replace(/(\d)\.(\d)/g, "$1$2");                              // 2.628 -> 2628
}
function tokens(s) {
  return new Set(limpio(s).replace(/[^A-Z0-9]/g, " ").split(/\s+/).filter((t) => t && !VACIAS.has(t)));
}
function sigla(s) {
  const m = limpio(s).match(/\(([A-Z]{3,})\)/);
  return m ? m[1] : null;
}
// Contención: cuánto del nombre más corto está contenido en el más largo. Así
// "Áreas de Conservación y Restauración" matchea con "…y Restauración
// Ambiental", que es el mismo área con un calificador de más.
function similitud(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const t of A) if (B.has(t)) comunes++;
  return comunes / Math.min(A.size, B.size);
}
const UMBRAL_SEGURO = 0.99;   // mismo área
const UMBRAL_DUDA = 0.6;      // candidato para que lo confirme una persona
function buscar(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const c of node.children || []) { const f = buscar(c, id); if (f) return f; }
  return null;
}
function recorrer(node, padre = null, out = []) {
  out.push({ node, padre });
  for (const c of node.children || []) recorrer(c, node, out);
  return out;
}
function genId(base, root) {
  let s = (base || "AREA").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "").slice(0, 12) || "AREA";
  let id = s, n = 1;
  while (buscar(root, id)) id = s + n++;
  return id;
}

// ── Main ───────────────────────────────────────────────────────────────
const org = JSON.parse(fs.readFileSync(ORG_PATH, "utf8"));
let funciones = {};
try { funciones = JSON.parse(fs.readFileSync(FUNCIONES_PATH, "utf8")) || {}; } catch { funciones = {}; }

const raiz = buscar(org, RAIZ);
if (!raiz) { console.error(`No existe el id "${RAIZ}" en data/organigrama.json.`); process.exit(1); }

const items = parsear(textoDe(ANEXO));
const areas = arbolDelAnexo(items);
console.log(`Anexo: ${items.length} título(s) · ${areas.length} área(s) de nivel DG o superior`);
if (!areas.length) { console.error("El anexo no produjo ninguna área: ¿es el anexo de responsabilidades y no el diagrama?"); process.exit(1); }

// El matching se acota al subárbol de la jurisdicción: "DG. Técnica,
// Administrativa y Legal" existe una vez por ministerio, así que cruzar por
// nombre contra todo el árbol manda el área al ministerio equivocado.
// En este organigrama los ministerios cuelgan de Jefatura de Gabinete, así que
// su subárbol contiene casi todo el gobierno. Comparar el anexo de Jefatura
// contra eso daría cientos de áreas "faltantes" que en realidad pertenecen a
// otra jurisdicción, cada una con su propio anexo. EXCLUIR poda esas ramas.
const EXCLUIR = new Set((process.env.EXCLUIR || "").split(",").map((s) => s.trim()).filter(Boolean));
function recorrerPodado(node, padre = null, out = []) {
  for (const c of node.children || []) {
    if (EXCLUIR.has(c.id)) continue;
    out.push({ node: c, padre: node });
    recorrerPodado(c, node, out);
  }
  return out;
}
const enSub = recorrerPodado(raiz);
const todos = recorrer(org).filter(({ node }) => node.id !== org.id);

// Mejor candidato dentro de un conjunto, por sigla o por similitud de palabras.
function mejor(a, candidatos) {
  const sg = sigla(a.nombre);
  if (sg) {
    const porSigla = candidatos.find(({ node }) => node.id === sg || limpio(node.nombre) === sg);
    if (porSigla) return { hit: porSigla, score: 1, via: "sigla" };
  }
  let hit = null, score = 0;
  for (const c of candidatos) {
    const s = similitud(a.nombre, c.node.nombre);
    if (s > score) { score = s; hit = c; }
  }
  return { hit, score, via: "nombre" };
}

const nuevas = [], movidas = [], iguales = [], renombres = [], desdeOtra = [], dudosas = [];
const vistos = new Set();

for (const a of areas) {
  const { hit, score, via } = mejor(a, enSub.filter(({ node }) => !vistos.has(node.id)));
  if (hit && score >= UMBRAL_SEGURO) {
    vistos.add(hit.node.id);
    a._id = hit.node.id;
    const idPadreReal = hit.padre ? hit.padre.id : null;
    // El padre según el anexo: el área de la que cuelga, o la raíz si es de
    // primer nivel. Se compara por similitud, no por igualdad de cadenas.
    const nombrePadreAnexo = a.padre ? a.padre.nombre : raiz.nombre;
    const nombrePadreReal = idPadreReal ? buscar(org, idPadreReal).nombre : null;
    const mismoPadre = nombrePadreReal && similitud(nombrePadreAnexo, nombrePadreReal) >= UMBRAL_SEGURO;
    if (!mismoPadre) movidas.push({ a, actual: hit, idPadreReal, padreAnexo: nombrePadreAnexo });
    else iguales.push({ a, actual: hit, via });
    // El anexo viene en mayúsculas y el repo en formato título: esa diferencia
    // no es un renombre. Solo interesa cuando cambian las palabras.
    const esperado = `${ABREV[a.tipo] ? ABREV[a.tipo] + " " : ""}${a.nombre}`;
    const difieren = [...tokens(hit.node.nombre)].sort().join("|") !== [...tokens(a.nombre)].sort().join("|");
    if (difieren) renombres.push({ a, actual: hit, esperado });
    continue;
  }
  // Fuera del subárbol: puede ser un área que cambia de jurisdicción.
  const fuera = mejor(a, todos.filter(({ node }) => !vistos.has(node.id)));
  if (fuera.hit && fuera.score >= UMBRAL_SEGURO) {
    vistos.add(fuera.hit.node.id);
    a._id = fuera.hit.node.id;
    desdeOtra.push({ a, actual: fuera.hit });
    continue;
  }
  // Hay un parecido razonable pero no concluyente. Crear un nodo acá sería
  // duplicar un área existente, que es el peor resultado posible: va al
  // informe para que lo resuelva una persona.
  const duda = hit && score >= UMBRAL_DUDA ? { hit, score } : (fuera.score >= UMBRAL_DUDA ? { hit: fuera.hit, score: fuera.score } : null);
  if (duda) dudosas.push({ a, candidato: duda.hit, score: duda.score });
  else nuevas.push(a);
}
const sobran = enSub.filter(({ node }) => !vistos.has(node.id) && SIGUE.has(node.tipo));

// ── Informe ────────────────────────────────────────────────────────────
const titulo = (a) => `${ABREV[a.tipo] ? ABREV[a.tipo] + " " : ""}${a.nombre}`;
let md = `# Anexo → organigrama — ${RAIZ}${NORMA ? ` (${NORMA})` : ""}\n\n`;
md += `Fuente: \`${path.basename(ANEXO)}\` · ${FECHA}\n\n`;
md += `Jurisdicción destino: **${raiz.nombre}** (\`${raiz.id}\`)\n\n`;
md += `El anexo trae ${items.length} título(s) numerado(s); ${areas.length} son de nivel DG o superior. `;
md += `Las Gerencias y Subgerencias Operativas se descartan: no forman parte de este organigrama.\n\n`;
md += `| | |\n|---|---|\n`;
md += `| Sin cambios | ${iguales.length} |\n| Cambian de dependencia | ${movidas.length} |\n`;
md += `| Nuevas | ${nuevas.length} |\n| Vienen de otra jurisdicción | ${desdeOtra.length} |\n`;
md += `| **Dudosas (requieren decisión)** | ${dudosas.length} |\n`;
md += `| En el repo y no en el anexo | ${sobran.length} |\n\n`;
md += `| Renombres | ${renombres.length} |\n\n`;

const bloque = (t, arr, fn) => { md += `## ${t} (${arr.length})\n\n`; md += arr.length ? arr.map(fn).join("\n") + "\n\n" : "_(ninguna)_\n\n"; };
bloque("Nuevas", nuevas, (a) => `- **${titulo(a)}** (${a.tipo}) — depende de \`${a.padre ? a.padre.nombre : raiz.nombre}\``);
bloque("Dudosas — requieren decisión", dudosas, ({ a, candidato, score }) =>
  `- **${titulo(a)}** (${a.tipo}) — ¿es \`${candidato.node.id}\` "${candidato.node.nombre}"? (parecido ${(score * 100).toFixed(0)}%)`);
bloque("Cambian de dependencia", movidas, ({ a, actual, idPadreReal, padreAnexo }) =>
  `- **${actual.node.nombre}** (\`${actual.node.id}\`) — de \`${idPadreReal}\` a "${padreAnexo}"`);
bloque("Renombres", renombres, ({ actual, esperado }) =>
  `- \`${actual.node.id}\` — "${actual.node.nombre}" → "${esperado}"`);
bloque("Vienen de otra jurisdicción", desdeOtra, ({ a, actual }) =>
  `- **${actual.node.nombre}** (\`${actual.node.id}\`) — hoy cuelga de \`${actual.padre ? actual.padre.id : "—"}\`, el anexo la ubica en ${RAIZ}`);
bloque("En el repo y no en el anexo", sobran, ({ node, padre }) =>
  `- **${node.nombre}** (\`${node.id}\`, ${node.tipo}) — depende de \`${padre ? padre.id : "—"}\``);
bloque("Sin cambios", iguales, ({ actual }) => `- ${actual.node.nombre} (\`${actual.node.id}\`)`);

md += `---\n\n`;
md += `> Las bajas **no se aplican solas**: un área que no figura en el anexo puede estar\n`;
md += `> simplemente fuera de su alcance. Revisalas y borralas a mano si corresponde.\n`;
md += `> Los titulares actuales se conservan: el anexo no los trae.\n`;

const out = process.env.OUT || path.join(ROOT, "docs", "anexos", `${FECHA}-${RAIZ}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md);
console.log(`Informe: ${out}`);
console.log(`  sin cambios ${iguales.length} · mudanzas ${movidas.length} · nuevas ${nuevas.length} · dudosas ${dudosas.length} · de otra jurisdicción ${desdeOtra.length} · sobran ${sobran.length} · renombres ${renombres.length}`);

function setOutput(k, v) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}

if (!APLICAR) {
  console.log("Modo informe (APLICAR != 1): no se escribió ningún JSON.");
  setOutput("changed", "true");   // el informe en sí ya es algo para revisar
  setOutput("aplicado", "false");
} else {
  // Mudanzas y altas. Las bajas nunca: son irreversibles y el anexo puede no
  // cubrir toda la jurisdicción.
  for (const { a, actual, idPadreReal } of movidas) {
    const nodo = buscar(org, actual.node.id);
    const viejo = buscar(org, idPadreReal);
    const nuevoPadre = a.padre ? buscar(org, a._idPadre || "") || actual.padre : raiz;
    if (!nodo || !viejo || !nuevoPadre) continue;
    viejo.children = (viejo.children || []).filter((x) => x.id !== nodo.id);
    nuevoPadre.children = nuevoPadre.children || [];
    nuevoPadre.children.push(nodo);
  }
  for (const a of nuevas) {
    const padre = a.padre && a.padre._id ? buscar(org, a.padre._id) : raiz;
    const nodo = { id: genId(a.nombre, org), nombre: titulo(a), tipo: a.tipo, titular: "", children: [] };
    a._id = nodo.id;
    (padre.children = padre.children || []).push(nodo);
  }
  // Funciones: para todo lo que quedó identificado.
  for (const a of areas) {
    if (!a._id) continue;
    if (!a.responsabilidad && !a.objetivos) continue;
    const e = funciones[a._id] || {};
    if (a.responsabilidad) e.responsabilidad = a.responsabilidad;
    if (a.objetivos) e.objetivos = a.objetivos;
    if (NORMA) e.fuente = NORMA;
    funciones[a._id] = e;
  }
  fs.writeFileSync(ORG_PATH, JSON.stringify(org, null, 2) + "\n");
  fs.writeFileSync(FUNCIONES_PATH, JSON.stringify(funciones, null, 1) + "\n");
  console.log("Escritos data/organigrama.json y data/funciones.json");
  setOutput("changed", "true");
  setOutput("aplicado", "true");
}
setOutput("informe", out);
setOutput("raiz", RAIZ);
