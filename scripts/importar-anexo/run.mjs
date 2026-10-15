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
  // Las unidades de auditoría interna encabezan sin prefijo de rango, y el
  // organigrama las guarda como organismos. Sin esta entrada quedaban sin
  // clasificar, y cada ministerio reportaba la suya como área faltante.
  ["UNIDAD DE AUDITORÍA INTERNA", "ORG"],
  ["UNIDAD DE AUDITORIA INTERNA", "ORG"],
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

// El mismo pie, pero incrustado en una línea de texto. Con -layout, pdftotext
// deja el número de expediente en la misma línea que el cuerpo cuando caen a la
// misma altura, y a veces sin un espacio que los separe:
//   "…dar cumplimiento a las Leyes 342, IF-2026-39728655-GCABA-MSEGC 6.353 y…"
//   "…del Gobierno de la Ciudad AutónomaIF-2026-39728655-GCABA-MSEGC"
// Filtrar solo la línea entera dejaba esa basura adentro de la responsabilidad:
// así quedaron 8 entradas del 306/26 con el expediente a mitad de oración.
const RUIDO_INLINE = /\s*IF-\d{4}-\d+-GCABA-\w+\s*/gi;

// La hoja de firmas del GEDO cierra el PDF y no es parte del anexo: trae el
// número de expediente, la fecha y el firmante. Al caer después del último
// título, se la quedaba entera la última área de cada anexo —así la DG. General
// de la Mujer terminó "firmada" por el Ministerio de Educación—.
function sinHojaDeFirmas(texto) {
  const lineas = texto.split(/\r?\n/);
  const i = lineas.findIndex((l) => /^\s*Hoja Adicional de Firmas\s*$/i.test(l));
  if (i < 0) return texto;
  // El banner del Gobierno y el lema del año preceden al rótulo y también son
  // de la hoja de firmas; se los descarta junto con ella.
  let desde = i;
  for (let k = i - 1; k >= 0 && k >= i - 6; k--) {
    const l = lineas[k].trim();
    if (!l || /^G\s+O\s+B\s+I\s+E\s+R\s+N\s+O\b/.test(l) || /^["“].*["”]$/.test(l)) desde = k;
    else break;
  }
  return lineas.slice(0, desde).join("\n");
}

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
// La sangría de la continuación no es fiable: va de cero espacios en adelante.
// Lo que sí distingue a una continuación del cuerpo del texto es que está
// íntegramente en mayúsculas; los párrafos del cuerpo traen minúsculas. Hay que
// excluir explícitamente el próximo título, que también es todo mayúsculas y
// sin la sangría ya no quedaría afuera.
const RE_CONT = /^\s*[A-ZÁÉÍÓÚÑ0-9(][A-ZÁÉÍÓÚÑ0-9 ,.\-–—()/°º]*$/;

function tipoY(nombre) {
  for (const [p, t] of PREFIJOS) {
    if (!nombre.startsWith(p)) continue;
    const resto = nombre.slice(p.length).replace(/^[\s\-–]+/, "").trim();
    // Hay títulos que son solo el rango ("UNIDAD DE AUDITORÍA INTERNA"): si se
    // le quita el prefijo no queda nada con qué buscarla en el organigrama.
    return [t, resto || nombre];
  }
  return ["?", nombre];
}

function parsear(texto) {
  const lineas = sinHojaDeFirmas(texto).split(/\r?\n/).map((l) => l.replace(RUIDO_INLINE, " "));
  const crudos = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = RE_TITULO.exec(lineas[i]);
    if (!m) continue;
    let titulo = m[2].trim();
    let j = i + 1;
    // El pie de página de GEDO (el código IF-… y el "Página N de M") puede caer
    // justo debajo de un título y parecer su continuación: así terminó un área
    // llamándose "DG. Técnica, Administrativa y Legal IF-2026-39458676-GCABA-MMIGC".
    while (j < lineas.length && RE_CONT.test(lineas[j]) && !RE_TITULO.test(lineas[j]) &&
           !RUIDO.test(lineas[j]) && lineas[j].trim().length > 1) {
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
  // Los rótulos reales de estos anexos, contados sobre los 17: "Descripción de
  // Acciones" (1051), "Descripción de Responsabilidades Primarias" (357) y
  // "Objetivos" (49). La versión anterior buscaba "Responsabilidades
  // Primarias" sin el "Descripción de" delante, que es como no buscar nada.
  const etiqueta = (l) => {
    const s = l.trim().toLowerCase().replace(/\s+/g, " ").replace(/[:.]$/, "");
    if (s.length > 70) return null;   // un rótulo es una línea corta
    if (/^descripci[óo]n de responsabilidad(es)? primaria/.test(s)) return "responsabilidad";
    if (/^responsabilidad(es)? primaria/.test(s)) return "responsabilidad";
    if (/^objetivos?$/.test(s)) return "objetivos";
    if (/^descripci[óo]n de acciones\b/.test(s)) return "objetivos";
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
  // Las áreas se copian primero y los padres se enlazan después, apuntando a
  // esas mismas copias. Si el padre apuntara al objeto original, el id que se
  // le resuelve más tarde a cada área no llegaría a sus hijas, y comparar la
  // dependencia por id no serviría de nada.
  const seguidas = items.filter((i) => SIGUE.has(i.tipo)).map((i) => ({ ...i }));
  const porNum = new Map(seguidas.map((i) => [i.num, i]));
  const padreDe = (num) => {
    const partes = num.split(".");
    for (let k = partes.length - 1; k > 0; k--) {
      const cand = porNum.get(partes.slice(0, k).join("."));
      if (cand) return cand;   // el ancestro más cercano que el organigrama sigue
    }
    return null;
  };
  for (const s of seguidas) s.padre = padreDe(s.num);
  return seguidas;
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
// El anexo y el repo alternan singular y plural para la misma área ("Análisis
// Estratégico" / "Análisis Estratégicos"), así que se compara sin la -s final.
function raizPalabra(t) {
  return t.length > 4 && t.endsWith("S") ? t.slice(0, -1) : t;
}
function tokens(s) {
  return new Set(limpio(s).replace(/[^A-Z0-9]/g, " ").split(/\s+/)
    .filter((t) => t && !VACIAS.has(t)).map(raizPalabra));
}
function sigla(s) {
  const m = limpio(s).match(/\(([A-Z]{3,})\)/);
  return m ? m[1] : null;
}
// Dos medidas, porque sirven para cosas distintas:
//   similitud  = palabras comunes sobre el total (Jaccard). Tolera un
//                calificador de más —"…y Restauración" vs "…y Restauración
//                Ambiental"— pero castiga que un nombre sea mucho más largo
//                que el otro.
//   contencion = cuánto del nombre más corto está en el más largo. Es laxa:
//                "Gobierno" está contenido en "Unidad Jefe de Gobierno" aunque
//                sean áreas distintas, así que sirve para sospechar, no para
//                decidir.
function contencion(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const t of A) if (B.has(t)) comunes++;
  return comunes / Math.min(A.size, B.size);
}
function similitud(a, b) {
  const A = tokens(a), B = tokens(b);
  // Hay nombres formados solo por palabras vacías —"Secretaría General" es
  // literalmente rango + calificador—, que dejan el conjunto en cero. Ahí se
  // comparan las cadenas enteras: si no, todo lo que cuelga de esa área parece
  // haber cambiado de dependencia.
  if (!A.size || !B.size) {
    const la = limpio(a).replace(/[^A-Z0-9]/g, ""), lb = limpio(b).replace(/[^A-Z0-9]/g, "");
    return la && la === lb ? 1 : 0;
  }
  let comunes = 0;
  for (const t of A) if (B.has(t)) comunes++;
  return comunes / (A.size + B.size - comunes);
}
const UMBRAL_SEGURO = 0.75;   // mismo área (tolera un calificador de más)
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
function mejor(a, candidatos, idPadreEsperado) {
  const sg = sigla(a.nombre);
  if (sg) {
    const porSigla = candidatos.find(({ node }) => node.id === sg || limpio(node.nombre) === sg);
    if (porSigla) return { hit: porSigla, score: 1, via: "sigla" };
  }
  const bien = (c) => !!(idPadreEsperado && c.padre && c.padre.id === idPadreEsperado);
  let hit = null, score = 0;
  for (const c of candidatos) {
    const s = similitud(a.nombre, c.node.nombre);
    // Colgar del padre que indica el anexo pesa más que parecerse un poco más
    // de nombre. Cada ministerio tiene su "Unidad de Auditoría Interna" y
    // además las de sus organismos fuera de nivel, que se llaman igual o casi:
    // sin esto, la del ministerio se iba a la de cualquier organismo cuyo
    // nombre no llevara sufijo, y aparecían dos mudanzas donde no había ninguna.
    // Para preferir al que cuelga del padre correcto se mira la contención y no
    // el parecido global: el anexo a veces infla el nombre con un paréntesis
    // —"(CIENTO VEINTISÉIS (126) CARGOS - CONTROLADORES…)"— que hunde el
    // parecido aunque el nombre del repo esté contenido entero.
    const gana = hit === null ||
      (bien(c) && !bien(hit) && contencion(a.nombre, c.node.nombre) >= UMBRAL_DUDA) ||
      (bien(c) === bien(hit) && (s > score ||
        (s === score && s > 0 && hit.node.tipo !== a.tipo && c.node.tipo === a.tipo)));
    if (gana) { score = s; hit = c; }
  }
  return { hit, score, via: "nombre" };
}

const nuevas = [], movidas = [], iguales = [], renombres = [], desdeOtra = [], dudosas = [];
const vistos = new Set();

for (const a of areas) {
  // Algunos anexos encabezan con la jurisdicción misma ("1 MINISTERIO DE
  // SEGURIDAD") y otros la dejan sin numerar. Cuando está, no es un área a
  // comparar: es la raíz. Si no se la reconoce, compite por el mismo nombre con
  // las áreas de adentro —"Ministerio de Seguridad" y "Secretaría de Seguridad"
  // se reducen ambas a "seguridad"— y el cruce arrastra a todo lo que cuelga.
  if (!a.padre && a.tipo === raiz.tipo && similitud(a.nombre, raiz.nombre) >= UMBRAL_SEGURO) {
    a._id = raiz.id;
    continue;
  }
  // El padre del anexo ya está resuelto a un id del repo: sirve para desempatar
  // nombres repetidos y para confirmar un parecido que por sí solo no alcanza.
  const idPadreAnexo = a.padre ? a.padre._id : raiz.id;
  const { hit, score, via } = mejor(a, enSub.filter(({ node }) => !vistos.has(node.id)), idPadreAnexo);
  // Un nombre contenido en el otro, colgando además del mismo padre, es la
  // misma área: el anexo suele agregar la ley que la crea ("Instituto de
  // Estadística y Censos" / "…de la Ciudad – Ley 6.724") o un calificativo.
  const confirmadoPorPadre = hit && idPadreAnexo && hit.padre && hit.padre.id === idPadreAnexo &&
    contencion(a.nombre, hit.node.nombre) === 1;
  if (hit && (score >= UMBRAL_SEGURO || confirmadoPorPadre)) {
    vistos.add(hit.node.id);
    a._id = hit.node.id;
    const idPadreReal = hit.padre ? hit.padre.id : null;
    // El padre según el anexo: el área de la que cuelga, o la raíz si es de
    // primer nivel. Se compara por similitud, no por igualdad de cadenas.
    // En el anexo los padres aparecen antes que sus hijas, así que para cuando
    // llegamos acá el padre ya está resuelto a un id del repo. Comparar ids es
    // exacto; comparar nombres no: el repo guarda "COPIDIS" y el anexo
    // "Comisión para la Plena Participación e Inclusión… (COPIDIS) - Ley 447",
    // que como cadenas no se parecen en nada y simulaban cinco mudanzas.
    const idPadreAnexo = a.padre ? a.padre._id : raiz.id;
    const nombrePadreAnexo = a.padre ? a.padre.nombre : raiz.nombre;
    const nombrePadreReal = idPadreReal ? buscar(org, idPadreReal).nombre : null;
    const mismoPadre = idPadreAnexo
      ? idPadreAnexo === idPadreReal
      : !!(nombrePadreReal && similitud(nombrePadreAnexo, nombrePadreReal) >= UMBRAL_SEGURO);
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
  const cDentro = hit ? contencion(a.nombre, hit.node.nombre) : 0;
  const cFuera = fuera.hit ? contencion(a.nombre, fuera.hit.node.nombre) : 0;
  const duda = cDentro >= UMBRAL_DUDA ? { hit, score: cDentro }
    : (cFuera >= UMBRAL_DUDA ? { hit: fuera.hit, score: cFuera } : null);
  if (duda) dudosas.push({ a, candidato: duda.hit, score: duda.score });
  else nuevas.push(a);
}
const sobran = enSub.filter(({ node }) => !vistos.has(node.id) && SIGUE.has(node.tipo));

if (process.env.DEBUG === "1") {
  for (const a of areas) {
    console.log(`  ${a.num.padEnd(9)} ${a.tipo.padEnd(4)} padre=${(a.padre ? a.padre.num : "-").padEnd(6)} id=${(a._id || "?").padEnd(12)} ${a.nombre}`);
  }
}

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
  // Con SOLO_FUNCIONES=1 no se toca el árbol: sirve para traer el texto de
  // responsabilidades de un anexo cuya estructura ya se revisó y aplicó a mano,
  // sin arrastrar de nuevo las altas que en esa revisión se decidió descartar.
  const SOLO_FUNCIONES = process.env.SOLO_FUNCIONES === "1";
  // Mudanzas y altas. Las bajas nunca: son irreversibles y el anexo puede no
  // cubrir toda la jurisdicción.
  for (const { a, actual, idPadreReal } of (SOLO_FUNCIONES ? [] : movidas)) {
    const nodo = buscar(org, actual.node.id);
    const viejo = buscar(org, idPadreReal);
    const nuevoPadre = a.padre ? buscar(org, a._idPadre || "") || actual.padre : raiz;
    if (!nodo || !viejo || !nuevoPadre) continue;
    viejo.children = (viejo.children || []).filter((x) => x.id !== nodo.id);
    nuevoPadre.children = nuevoPadre.children || [];
    nuevoPadre.children.push(nodo);
  }
  for (const a of (SOLO_FUNCIONES ? [] : nuevas)) {
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
  if (!SOLO_FUNCIONES) fs.writeFileSync(ORG_PATH, JSON.stringify(org, null, 2) + "\n");
  fs.writeFileSync(FUNCIONES_PATH, JSON.stringify(funciones, null, 1) + "\n");
  console.log(SOLO_FUNCIONES ? "Escrito data/funciones.json" : "Escritos data/organigrama.json y data/funciones.json");
  setOutput("changed", "true");
  setOutput("aplicado", "true");
}
setOutput("informe", out);
setOutput("raiz", RAIZ);
