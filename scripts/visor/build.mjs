// Genera visor.html: el organigrama entero en un solo archivo, sin servidor.
//
// A diferencia de index.html —que es la app, con editor y exportación A3— esto
// es un documento: se abre con doble clic, viaja por mail y funciona sin red.
// Los datos van incrustados, así que una copia guardada hoy sigue mostrando lo
// de hoy aunque el repo cambie mañana.
//
//   node scripts/visor/build.mjs
//
// Hay que volver a correrlo cuando cambian los datos. El HTML generado se
// commitea: es el entregable.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const leer = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", p), "utf8"));
const org = leer("organigrama.json");
const funciones = leer("funciones.json");

// ── Árbol ──────────────────────────────────────────────────────────────
const nodos = new Map();
const padre = new Map();
(function w(n, p) {
  nodos.set(n.id, n);
  padre.set(n.id, p);
  for (const c of n.children || []) w(c, n.id);
})(org, null);

const hijos = (id) => (nodos.get(id).children || []).map((c) => c.id);
function descendientes(id) {
  return hijos(id).reduce((a, c) => a + 1 + descendientes(c), 0);
}

// ── Hojas ──────────────────────────────────────────────────────────────
// Una hoja por jurisdicción, como en los organigramas oficiales: el Jefe de
// Gobierno y su gabinete arriba, y después cada ministerio, secretaría u
// organismo con su estructura. Un área grande que cuelga de otra se lleva su
// propia hoja para que ninguna quede ilegible; el umbral sale de los datos: con
// 15 descendientes quedan 33 hojas de entre 3 y 42 áreas.
// Una hoja por jurisdicción, con todo adentro: las subsecretarías lado a lado
// y las direcciones generales apiladas bajo cada una. Partir por subsecretaría
// —como hace el anexo oficial, que para Hacienda son 13 páginas— dejaba las
// direcciones generales en otra hoja, y entonces no se veía de qué
// subsecretaría cuelga cada una, que es lo que el dibujo tiene que mostrar.
const UMBRAL_HOJA = 15;
const hojas = [org.id];
for (const c of hijos(org.id)) if (hijos(c).length) hojas.push(c);
for (const c of hijos("MJGGC")) if (hijos(c).length) hojas.push(c);
const jurisdicciones = new Set(hojas);
const fueraDeNivel = (id) => nodos.get(id).dashed || ["ORG", "OTRO"].includes(nodos.get(id).tipo);
for (const id of nodos.keys()) {
  if (hojas.includes(id)) continue;
  const p = padre.get(id);
  // Un organismo fuera de nivel con estructura SIEMPRE abre hoja: en el dibujo
  // por calles sus direcciones generales irían a la calle de arriba, es decir
  // por encima del organismo del que dependen.
  // Un organismo fuera de nivel con estructura siempre abre hoja: en el dibujo
  // por calles sus direcciones generales irían a la calle de arriba, es decir
  // por encima del organismo del que dependen.
  if (hijos(id).length && fueraDeNivel(id)) hojas.push(id);
  else if (descendientes(id) >= UMBRAL_HOJA) hojas.push(id);
}
const esHoja = new Set(hojas);

// El subárbol de una hoja se corta en las otras hojas: esas aparecen como una
// tarjeta más, con un enlace, y no se despliegan acá.
function subarbol(id, raiz = true) {
  const out = [id];
  if (!raiz && esHoja.has(id)) return out;
  for (const c of hijos(id)) out.push(...subarbol(c, false));
  return out;
}

const ordenHojas = hojas.slice().sort((a, b) => {
  if (a === org.id) return -1;
  if (b === org.id) return 1;
  const ra = padre.get(a) === org.id ? 0 : 1;
  const rb = padre.get(b) === org.id ? 0 : 1;
  return ra - rb || nodos.get(a).nombre.localeCompare(nodos.get(b).nombre, "es");
});

const cubiertos = new Set(ordenHojas.flatMap((id) => subarbol(id)));
const sueltos = [...nodos.keys()].filter((id) => !cubiertos.has(id));
if (sueltos.length) {
  console.error(`Hay ${sueltos.length} área(s) que no caen en ninguna hoja: ${sueltos.join(", ")}`);
  process.exit(1);
}

const datos = {
  generado: new Date().toISOString().slice(0, 10),
  commit: (() => {
    try {
      return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
    } catch {
      return "";
    }
  })(),
  raiz: org.id,
  hojas: ordenHojas.map((id) => ({
    id,
    nombre: nodos.get(id).nombre,
    ids: subarbol(id),
  })),
  nodos: Object.fromEntries(
    [...nodos].map(([id, n]) => [id, {
      nombre: n.nombre,
      tipo: n.tipo || "ORG",
      titular: n.titular || "",
      dashed: !!n.dashed,
      padre: padre.get(id),
      hijos: hijos(id),
    }]),
  ),
  funciones,
};

const total = nodos.size;
const conFunciones = [...nodos.keys()].filter((id) => funciones[id]).length;

// ── Página ─────────────────────────────────────────────────────────────
const json = JSON.stringify(datos).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Organigrama GCBA</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Open+Sans:wght@400;600;700&display=swap">
<style>
/* Documento de hojas: una por jurisdicción, barra fija arriba y panel de
   detalle a la derecha que en pantalla angosta pasa a ser una ficha abajo.
   Los colores por rango son los del organigrama oficial, los mismos que usa
   el A3 de index.html. */
:root{
  --tinta:#101e37; --tinta-2:#3c4a63; --tinta-3:#6b7892;
  --papel:#eef1f5; --hoja:#ffffff; --linea:#d4dae4; --linea-2:#e7ebf1;
  --acento:#005387; --acento-suave:#e8f0f7; --marca:#ffd400;
  --jg:#9b1c1c; --min:#f5871f; --sec:#ffd400; --ss:#004f86; --dg:#268948; --sigla-bg:#4a5568;
  --orgc:#e4e9ed; --orgc-fg:#1d2735;
  --edit:#b45309; --edit-bg:#fef3c7;
  --sombra:0 1px 2px #101e370d, 0 8px 24px #101e3712;
  --display:"Archivo","Segoe UI",system-ui,sans-serif;
  --texto:"Open Sans","Segoe UI",system-ui,sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --tinta:#e8ecf3; --tinta-2:#aab6cb; --tinta-3:#7f8da6;
  --papel:#10151f; --hoja:#19202e; --linea:#2c3647; --linea-2:#232c3b;
  --acento:#6cb6e8; --acento-suave:#1b2a3b; --marca:#ffd400;
  --orgc:#56637a; --orgc-fg:#eef2f8; --sigla-bg:#2b3444; --edit:#fbbf24; --edit-bg:#3b2f14;
  --sombra:0 1px 2px #0006, 0 8px 24px #0004;
  color-scheme:dark;
}}
:root[data-theme="dark"]{
  --tinta:#e8ecf3; --tinta-2:#aab6cb; --tinta-3:#7f8da6;
  --papel:#10151f; --hoja:#19202e; --linea:#2c3647; --linea-2:#232c3b;
  --acento:#6cb6e8; --acento-suave:#1b2a3b; --marca:#ffd400;
  --orgc:#56637a; --orgc-fg:#eef2f8; --sigla-bg:#2b3444; --edit:#fbbf24; --edit-bg:#3b2f14;
  --sombra:0 1px 2px #0006, 0 8px 24px #0004;
  color-scheme:dark;
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--papel);color:var(--tinta);font:15px/1.5 var(--texto)}
h1,h2,h3{font-family:var(--display);text-wrap:balance;margin:0}

/* barra */
.barra{position:sticky;top:0;z-index:20;background:var(--tinta);color:#fff;box-shadow:var(--sombra)}
.barra-in{display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  padding-block:11px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.marca{display:flex;align-items:baseline;gap:9px;min-width:0}
.marca b{font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.01em}
.marca span{font-size:11.5px;color:#aab8d0;white-space:nowrap}
.barra-ctl{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0;max-width:100%}
select,input,button,textarea{font:inherit;font-family:var(--texto)}
.barra select,.barra input{background:#ffffff14;border:1px solid #ffffff33;color:#fff;border-radius:7px;padding:7px 9px;font-size:13px;min-width:0}
/* Un <select> se estira hasta su opción más larga —acá, el nombre de
   jurisdicción más largo— y empuja la página a lo ancho en el teléfono. */
.barra select{flex:0 1 auto;max-width:min(100%,230px);text-overflow:ellipsis}
.barra input{flex:1 1 170px;max-width:100%}
.barra select option{color:#101e37}
.barra input::placeholder{color:#9fb0ca}
.barra input:focus-visible,.barra select:focus-visible{outline:2px solid var(--marca);outline-offset:1px}
.btn{background:#ffffff16;border:1px solid #ffffff33;color:#fff;border-radius:7px;padding:7px 11px;font-size:13px;cursor:pointer}
.btn:hover{background:#ffffff28}
.btn.pri{background:var(--marca);border-color:var(--marca);color:#101e37;font-weight:600}
.btn:focus-visible{outline:2px solid var(--marca);outline-offset:2px}

/* buscador */
.buscador{position:relative;min-width:0;flex:1 1 170px;display:block}
.resultados{position:absolute;top:calc(100% + 6px);right:0;width:min(420px,88vw);background:var(--hoja);
  color:var(--tinta);border:1px solid var(--linea);border-radius:10px;box-shadow:var(--sombra);
  max-height:min(60vh,420px);overflow:auto;z-index:30;padding:5px}
.resultados button{display:block;width:100%;text-align:left;background:none;border:0;border-radius:7px;
  padding:8px 10px;cursor:pointer;color:inherit;font-size:13px;line-height:1.35}
.resultados button:hover,.resultados button:focus-visible{background:var(--acento-suave);outline:none}
.resultados .sig{font-weight:700;font-size:11px;color:var(--acento);letter-spacing:.03em}
.resultados .don{color:var(--tinta-3);font-size:11.5px}
.vacio{padding:12px 10px;color:var(--tinta-3);font-size:13px}

/* cuerpo */
.cuerpo{display:grid;grid-template-columns:minmax(0,1fr) 336px;gap:20px;align-items:start;
  padding-block:20px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
@media (max-width:900px){.cuerpo{grid-template-columns:minmax(0,1fr)}}

.intro{background:var(--hoja);border:1px solid var(--linea);border-radius:12px;padding:18px 20px;margin-bottom:18px}
.intro h1{font-size:20px;margin-bottom:6px}
.intro p{margin:0;color:var(--tinta-2);font-size:13.5px;max-width:65ch}
.cifras{display:flex;gap:22px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--linea-2)}
.cifra b{display:block;font-family:var(--display);font-size:21px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.cifra span{font-size:11px;color:var(--tinta-3);text-transform:uppercase;letter-spacing:.06em}

.leyenda{display:flex;gap:7px 14px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--linea-2);font-size:11.5px;color:var(--tinta-2)}
.leyenda i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px;border:1px solid #0002}

.hoja{background:var(--hoja);border:1px solid var(--linea);border-radius:12px;margin-bottom:18px;
  overflow:hidden;scroll-margin-top:84px}
.hoja-tit{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:13px 18px;border-bottom:1px solid var(--linea-2)}
.hoja-tit h2{font-size:15.5px}
.hoja-tit span{font-size:11.5px;color:var(--tinta-3);font-variant-numeric:tabular-nums}
.lienzo{overflow-x:auto}
/* En el teléfono una hoja grande achicada a 368px queda ilegible. Se le pone
   un piso y se la deja correr adentro de su propia caja; el cuerpo de la
   página nunca scrollea de lado. */
.lienzo svg{display:block;height:auto;max-width:100%;min-width:min(640px,100%)}
@media (max-width:700px){.lienzo svg{max-width:none;min-width:640px}}
.tarjeta{cursor:pointer}
.tarjeta:focus{outline:none}
.tarjeta .marco{transition:opacity .12s}
.tarjeta:hover .marco,.tarjeta:focus .marco{opacity:.82}

/* panel */
.panel{position:sticky;top:84px;background:var(--hoja);border:1px solid var(--linea);border-radius:12px;
  padding:18px;max-height:calc(100vh - 104px);overflow:auto}
@media (max-width:900px){.panel{position:static;max-height:none}}
.panel h3{font-size:16px;line-height:1.3;margin-bottom:4px}
.rango{display:inline-block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
  padding:3px 8px;border-radius:999px;color:#fff}
.sig{font-family:var(--display);font-weight:700;font-size:12px;letter-spacing:.04em;color:var(--acento)}
.campo{margin-top:15px}
.campo label{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tinta-3);margin-bottom:5px}
.campo input{width:100%;background:var(--papel);border:1px solid var(--linea);color:var(--tinta);border-radius:7px;padding:8px 9px;font-size:13.5px}
.campo input:focus-visible{outline:2px solid var(--acento);outline-offset:-1px;border-color:var(--acento)}
.dato{font-size:13.5px;color:var(--tinta-2)}
.enlace{background:none;border:0;padding:0;color:var(--acento);cursor:pointer;font:inherit;font-size:13.5px;text-align:left;text-decoration:underline;text-underline-offset:2px}
.enlace:hover{text-decoration-thickness:2px}
.lista{display:flex;flex-direction:column;gap:3px;margin-top:4px}
.func{margin-top:17px;padding-top:15px;border-top:1px solid var(--linea-2)}
.func h4{font-family:var(--display);font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--tinta-3);margin:0 0 6px}
.func p{margin:0 0 12px;font-size:13px;line-height:1.62;color:var(--tinta-2)}
.fuente{font-size:11.5px;color:var(--tinta-3)}
.editado{display:inline-block;margin-top:10px;font-size:11.5px;color:var(--edit);background:var(--edit-bg);
  border-radius:6px;padding:4px 8px}
.panel-vacio{color:var(--tinta-3);font-size:13.5px;line-height:1.6}
.aviso{margin-top:14px;padding:11px 12px;background:var(--acento-suave);border-radius:8px;font-size:12px;color:var(--tinta-2)}
.pie{color:var(--tinta-3);font-size:12px;padding-block:8px 28px;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
/* Impresión: A3 vertical, una jurisdicción por hoja y nada recortado. El
   dibujo se escala solo porque el SVG lleva viewBox; el tope de alto deja
   lugar para el título de la hoja. */
.portada{display:none}
@page{size:A3 landscape;margin:9mm}
@media print{
  :root{--papel:#fff;--hoja:#fff;--linea:#9aa6b8;--linea-2:#c6cedb;--tinta:#101e37;--tinta-2:#3c4a63;--tinta-3:#6b7892}
  body{background:#fff;font-size:10pt}
  .barra,.panel,.pie,.intro,#res{display:none!important}
  .cuerpo{display:block;padding:0}
  .portada{display:block;break-after:page}
  .portada h1{font-size:26pt;line-height:1.15;margin-bottom:6mm}
  .portada .bajada{font-size:11pt;color:var(--tinta-2);max-width:none;margin-bottom:8mm}
  .portada .cifras{border:0;padding:0;margin:0 0 8mm;gap:14mm}
  .portada .leyenda{border:0;padding:0;margin:0 0 10mm;font-size:9pt}
  .portada ol{columns:4;column-gap:8mm;font-size:8.2pt;color:var(--tinta-2);margin:0;padding:0;list-style:none}
  .portada li{break-inside:avoid;margin-bottom:.9mm}
  .portada li b{font-variant-numeric:tabular-nums;color:var(--tinta);font-weight:600}
  .hoja{break-before:page;break-inside:avoid;border:0;border-radius:0;margin:0;box-shadow:none}
  .hoja-tit{border-bottom:1.2pt solid var(--tinta);padding:0 0 2mm;margin-bottom:3mm}
  .hoja-tit h2{font-size:14pt}
  .hoja-tit span{font-size:9pt}
  .lienzo{overflow:visible}
  .lienzo svg{width:auto;height:auto;min-width:0;max-width:100%;max-height:262mm}
  .tarjeta{cursor:auto}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
</style>
</head>
<body>
<header class="barra">
  <div class="barra-in">
    <span class="marca"><b>Organigrama GCBA</b><span>${total} áreas · al ${datos.generado}</span></span>
    <span class="barra-ctl">
      <label class="buscador">
        <input id="q" type="search" placeholder="Buscar área, sigla o titular…" autocomplete="off" aria-label="Buscar">
        <span id="res" class="resultados" hidden></span>
      </label>
      <select id="ir" aria-label="Ir a una hoja"></select>
      <button type="button" class="btn" id="copiar">Copiar JSON</button>
      <button type="button" class="btn" id="pliego">Pliego SVG</button>
      <button type="button" class="btn" id="bajar">Guardar copia</button>
      <button type="button" class="btn pri" id="imprimir">Imprimir A3</button>
    </span>
  </div>
</header>

<div class="cuerpo">
  <main>
    <section class="intro">
      <h1>El Poder Ejecutivo de la Ciudad, área por área</h1>
      <p>Una hoja por jurisdicción. Cada tarjeta trae el área, su sigla y quién la conduce; al tocarla,
         el panel muestra de quién depende, qué áreas tiene a cargo y sus responsabilidades primarias
         tal como las aprueba el decreto que las fija. El archivo es autónomo: lleva los datos adentro
         y funciona sin conexión.</p>
      <div class="cifras">
        <span class="cifra"><b>${total}</b><span>áreas</span></span>
        <span class="cifra"><b>${ordenHojas.length}</b><span>hojas</span></span>
        <span class="cifra"><b>${conFunciones}</b><span>con misiones y funciones</span></span>
      </div>
      <div class="leyenda" id="leyenda"></div>
    </section>
    <section class="portada">
      <h1>Organigrama del Gobierno de la Ciudad Autónoma de Buenos Aires</h1>
      <p class="bajada">Poder Ejecutivo completo al ${datos.generado}: ${total} áreas en ${ordenHojas.length} hojas,
         una por jurisdicción. Incluye los organismos fuera de nivel y las unidades de auditoría interna,
         que se dibujan con el borde punteado.</p>
      <div class="cifras">
        <span class="cifra"><b>${total}</b><span>áreas</span></span>
        <span class="cifra"><b>${ordenHojas.length}</b><span>hojas</span></span>
        <span class="cifra"><b>${conFunciones}</b><span>con misiones y funciones</span></span>
      </div>
      <div class="leyenda" id="leyenda-portada"></div>
      <ol id="indice"></ol>
    </section>
    <div id="hojas"></div>
  </main>
  <aside class="panel" id="panel" aria-live="polite"></aside>
</div>
<p class="pie">Generado desde <code>data/organigrama.json</code>, <code>data/funciones.json</code>${datos.commit ? ` · commit <code>${datos.commit}</code>` : ""}. Las ediciones son locales hasta que guardes una copia o copies el JSON.</p>

<script id="datos" type="application/json">${json}</script>
<script>
"use strict";
const D = JSON.parse(document.getElementById("datos").textContent);
const N = D.nodos;
const original = JSON.parse(JSON.stringify(N));
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const RANGO = {
  JG: ["Jefatura", "var(--jg)", "#fff"], VJG: ["Vicejefatura", "var(--jg)", "#fff"],
  MIN: ["Ministerio", "var(--min)", "#231302"], SEC: ["Secretaría", "var(--sec)", "#2b2200"],
  SS: ["Subsecretaría", "var(--ss)", "#fff"], DG: ["Dir. General", "var(--dg)", "#fff"],
  GG: ["Gerencia General", "var(--dg)", "#fff"], GO: ["Gerencia Operativa", "var(--dg)", "#fff"],
  ORG: ["Organismo", "var(--orgc)", "var(--orgc-fg)"], OTRO: ["Área", "var(--orgc)", "var(--orgc-fg)"],
};
const rango = (t) => RANGO[t] || RANGO.ORG;

const LEYENDA = [["JG", "Jefatura"], ["MIN", "Ministerio"], ["SEC", "Secretaría"], ["SS", "Subsecretaría"], ["DG", "Dirección General"], ["ORG", "Organismo fuera de nivel"]]
  .map(([t, n]) => \`<span><i style="background:\${rango(t)[1]}"></i>\${n}</span>\`).join("");
$("#leyenda").innerHTML = LEYENDA;
$("#leyenda-portada").innerHTML = LEYENDA;
// La hoja n se imprime en la página n+1: la portada ocupa la primera.
$("#indice").innerHTML = D.hojas.map((h, i) => \`<li><b>\${i + 2}</b> · \${esc(h.nombre)}</li>\`).join("");

// ── Medición de texto, para que el nombre entre en la caja ──────────────
const cx = document.createElement("canvas").getContext("2d");
function partir(txt, ancho, fs, peso) {
  cx.font = peso + " " + fs + "px " + getComputedStyle(document.body).fontFamily;
  const out = []; let linea = "";
  for (const p of String(txt).split(/\\s+/)) {
    const t = linea ? linea + " " + p : p;
    if (linea && cx.measureText(t).width > ancho) { out.push(linea); linea = p; } else linea = t;
  }
  if (linea) out.push(linea);
  return out;
}
function ajustar(txt, ancho, alto, max, min, peso) {
  for (let fs = max; fs >= min; fs -= 0.25) {
    const l = partir(txt, ancho, fs, peso);
    if (l.length * fs * 1.22 <= alto) return { lineas: l, fs };
  }
  const l = partir(txt, ancho, min, peso);
  return { lineas: l.slice(0, Math.max(1, Math.floor(alto / (min * 1.22)))), fs: min };
}

// ── Disposición: calles por rango ──────────────────────────────────────
// Como los anexos oficiales: una calle horizontal por rango —MINISTERIO,
// SUBSECRETARÍA, DIRECCIÓN GENERAL— y los organismos fuera de nivel todos
// juntos en la calle de abajo.
//
// La caja va en la calle de SU RANGO, no en la de su profundidad en el árbol.
// Importa: una Dirección General que cuelga directo del ministerio baja igual
// a la calle de direcciones generales, con la línea cruzando la calle de
// subsecretarías. Ponerla por profundidad la dejaba al lado de las
// subsecretarías, como si fuera una de ellas.
//
// Dentro de una calle, las hijas de un mismo padre se apilan en una columna,
// con una espina vertical y un pie a cada caja. Así el ancho lo da la cantidad
// de padres y no la de hijas, que es lo que mantiene la hoja imprimible.
const ANCHO = 170, COL = 206, ALTO_MIN = 34, FILA = 13, PADX = 16, PADY = 16;
const CALLE_SEP = 34, CANAL = 10;
const H_SIGLA = 13, H_TITULAR = 21, MAX_PILA = 6;

const RANGO_CALLE = { JG: 1, VJG: 1, MIN: 1, SEC: 1, SS: 2, DG: 3, GG: 3, GO: 4, SGO: 4 };
const FUERA = 9;
const ROTULO_CALLE = { 0: "", 1: "MINISTERIO", 2: "SUBSECRETARÍA", 3: "DIRECCIÓN GENERAL", 4: "GERENCIA", 9: "FUERA DE NIVEL" };
const esUAI = (id) => /^unidad de auditor[íi]a interna/i.test(N[id].nombre);
function calleDe(id, raiz) {
  if (id === raiz) return 0;
  // La unidad de auditoría interna de la jurisdicción va arriba, al lado de la
  // cabecera, y no abajo con los organismos fuera de nivel. Así la dibuja el
  // organigrama oficial.
  if (esUAI(id) && N[id].padre === raiz) return 0;
  const t = N[id].tipo;
  if (t === "ORG" || t === "OTRO" || N[id].dashed) return FUERA;
  return RANGO_CALLE[t] ?? FUERA;
}

function disponer(raiz, ids, cortar = true) {
  const dentro = new Set(ids);
  const hijosEn = (id) => (N[id].hijos || []).filter((k) => dentro.has(k) && k !== id);
  const corta = (id) => cortar && esHojaPropia(id) && id !== raiz;
  const abre = (id) => hijosEn(id).length > 0 && !corta(id);

  function alto(id) {
    const n = N[id];
    const t = ajustar(n.nombre, ANCHO - 14, 46, 10.5, 7, "700").lineas.length;
    return Math.max(ALTO_MIN, 11 + t * 12) + H_SIGLA + (n.titular ? H_TITULAR : 0);
  }

  const pos = new Map();          // id -> {c: calle, k: columna, i: orden de apilado}
  const cuenta = new Map();
  const poner = (id, c, k) => {
    const key = c + "|" + k;
    const i = cuenta.get(key) || 0;
    cuenta.set(key, i + 1);
    pos.set(id, { c, k, i });
  };

  let cursor = 0;
  const fuera = [], uaisRaiz = [];
  function colocar(id) {
    const miCalle = calleDe(id, raiz);
    // Una adjunta es una Dirección General que depende de otra Dirección
    // General: misma calle que su padre. Va apilada justo debajo de él y en su
    // misma columna; si no, queda al costado y se lee como si fuera su par.
    const linaje = [id];
    const sueltos = [];
    (function juntar(x) {
      for (const k of corta(x) ? [] : hijosEn(x)) {
        // La UAI comparte calle con la cabecera pero no es una adjunta suya:
        // va al costado, no apilada debajo.
        if (esUAI(k) && N[k].padre === raiz) { uaisRaiz.push(k); continue; }
        if (miCalle !== FUERA && calleDe(k, raiz) === miCalle) { linaje.push(k); juntar(k); }
        else sueltos.push(k);
      }
    })(id);
    const normales = sueltos.filter((x) => calleDe(x, raiz) !== FUERA);
    sueltos.filter((x) => calleDe(x, raiz) === FUERA).forEach((x) => fuera.push(x));
    const ramas = normales.filter(abre);
    const hojas = normales.filter((x) => !abre(x));
    const tramos = ramas.map(colocar);
    // Una pila muy larga deja la hoja alta y flaca, y en A3 la letra se vuelve
    // ilegible: se la reparte en columnas, como hace el organigrama oficial
    // con los ministerios.
    if (hojas.length) {
      const trozos = Math.ceil(hojas.length / MAX_PILA);
      const porColumna = Math.ceil(hojas.length / trozos);
      for (let i = 0; i < trozos; i++) {
        const k = cursor++;
        for (const x of hojas.slice(i * porColumna, (i + 1) * porColumna)) poner(x, calleDe(x, raiz), k);
        tramos.push([k, k]);
      }
    }
    let a, z;
    if (tramos.length) { a = Math.min(...tramos.map((t) => t[0])); z = Math.max(...tramos.map((t) => t[1])); }
    else { a = z = cursor++; }
    for (const x of linaje) poner(x, miCalle, (a + z) / 2);
    return [a, z];
  }
  colocar(raiz);
  // La unidad de auditoría interna de la jurisdicción, a la derecha de la
  // cabecera y a su misma altura.
  uaisRaiz.forEach((x, n) => poner(x, 0, pos.get(raiz).k + 1 + n));

  // Los fuera de nivel van todos juntos en la calle de abajo, en el orden en
  // que aparecen sus padres, y doblan a una fila nueva cuando no entran.
  const anchoCols = Math.max(1, cursor);
  fuera.forEach((x, n) => poner(x, FUERA, n % anchoCols));

  // Alto de cada calle: la columna más cargada manda.
  const altos = new Map([...pos.keys()].map((id) => [id, alto(id)]));
  const calles = [...new Set([...pos.values()].map((p) => p.c))].sort((a, b) => a - b);
  const yCalle = new Map(), altoCalle = new Map();
  for (const c of calles) {
    const porCol = new Map();
    for (const [id, p] of pos) if (p.c === c) porCol.set(p.k, (porCol.get(p.k) || 0) + altos.get(id) + FILA);
    altoCalle.set(c, Math.max(...porCol.values()) - FILA);
  }
  let yy = PADY;
  for (const c of calles) { yCalle.set(c, yy); yy += altoCalle.get(c) + CALLE_SEP; }
  const altoTot = yy - CALLE_SEP + PADY;

  // Coordenadas finales. Dentro de una columna se apila por orden de llegada.
  const cajas = new Map();
  const acum = new Map();
  for (const [id, p] of [...pos].sort((a, b) => a[1].c - b[1].c || a[1].k - b[1].k || a[1].i - b[1].i)) {
    const key = p.c + "|" + p.k;
    const dy = acum.get(key) || 0;
    cajas.set(id, {
      x: PADX + CANAL + p.k * COL, y: yCalle.get(p.c) + dy,
      w: ANCHO, h: altos.get(id), calle: p.c, col: p.k,
    });
    acum.set(key, dy + altos.get(id) + FILA);
  }
  const anchoTot = Math.max(...[...cajas.values()].map((c) => c.x + c.w)) + PADX;
  return { cajas, anchoTot, altoTot, calles, yCalle, altoCalle };
}
const hojaIds = new Set(D.hojas.map((h) => h.id));
const esHojaPropia = (id) => hojaIds.has(id);

// ── Dibujo ─────────────────────────────────────────────────────────────
function tarjetaSVG(id, c) {
  const n = N[id];
  const [, bg, fg] = rango(n.tipo);
  const hTit = n.titular ? H_TITULAR : 0;
  const hNom = c.h - H_SIGLA - hTit;
  const t = ajustar(n.nombre, c.w - 14, hNom - 6, 10.5, 7, "700");
  const y0 = c.y + (hNom - t.lineas.length * t.fs * 1.18) / 2 + t.fs * 0.88;
  const guion = n.dashed ? ' stroke-dasharray="4 3"' : "";
  let s = \`<g class="tarjeta" data-id="\${esc(id)}" tabindex="0" role="button" aria-label="\${esc(n.nombre)}">\`;
  s += \`<title>\${esc(n.nombre)}\${n.titular ? " — " + esc(n.titular) : ""}</title>\`;
  s += \`<rect class="marco" x="\${c.x}" y="\${c.y}" width="\${c.w}" height="\${hNom}" fill="\${bg}" stroke="#00000022"\${guion}/>\`;
  s += \`<text font-family="var(--texto)" font-size="\${t.fs}" font-weight="700" fill="\${fg}" text-anchor="middle">\`;
  s += t.lineas.map((l, i) => \`<tspan x="\${c.x + c.w / 2}" y="\${y0 + i * t.fs * 1.18}">\${esc(l)}</tspan>\`).join("");
  s += "</text>";
  // Franja de la sigla, como en el organigrama oficial.
  s += \`<rect x="\${c.x}" y="\${c.y + hNom}" width="\${c.w}" height="\${H_SIGLA}" fill="var(--sigla-bg)"/>\`;
  s += \`<text x="\${c.x + c.w / 2}" y="\${c.y + hNom + 9.3}" font-family="var(--display)" font-size="7.6" font-weight="700" letter-spacing=".4" fill="#ffffff" text-anchor="middle">\${esc(id)}</text>\`;
  if (n.titular) {
    const tt = ajustar(n.titular, c.w - 6, H_TITULAR - 3, 8, 6, "400");
    const yt = c.y + hNom + H_SIGLA + (H_TITULAR - tt.lineas.length * tt.fs * 1.15) / 2 + tt.fs * 0.9;
    s += \`<text font-family="var(--texto)" font-size="\${tt.fs}" fill="var(--tinta-2)" text-anchor="middle">\`;
    s += tt.lineas.slice(0, 2).map((l, i) => \`<tspan x="\${c.x + c.w / 2}" y="\${yt + i * tt.fs * 1.15}">\${esc(l)}</tspan>\`).join("");
    s += "</text>";
  }
  if (!pliego && esHojaPropia(id) && id !== cajaRaiz) {
    s += \`<circle cx="\${c.x + c.w - 9}" cy="\${c.y + 9}" r="6.5" fill="#ffffff" fill-opacity=".88"/>\`;
    s += \`<text x="\${c.x + c.w - 9}" y="\${c.y + 12.2}" font-size="9" font-weight="700" fill="#101e37" text-anchor="middle">↗</text>\`;
  }
  return s + "</g>";
}

// Los vínculos se enganchan al bloque del nombre, no al titular, que queda
// suelto debajo de la caja.
const anclaAlto = (id, c) => c.y + (c.h - H_SIGLA - (N[id].titular ? H_TITULAR : 0)) / 2;
const anclaPie = (id, c) => c.y + c.h - H_SIGLA - (N[id].titular ? H_TITULAR : 0) + H_SIGLA;

let cajaRaiz = null, pliego = false;
function svgDe(d, rotulo, interno = false) {
  const { cajas, anchoTot, altoTot, calles, yCalle, altoCalle } = d;
  let fondo = "", lineas = "";

  // El organigrama oficial no rotula las calles: separa con una sola línea
  // horizontal lo que está fuera de nivel de lo que está en la estructura.
  if (calles.includes(FUERA) && calles.length > 1) {
    const yr = yCalle.get(FUERA) - CALLE_SEP / 2 - 4;
    fondo += \`<line x1="\${PADX}" y1="\${yr}" x2="\${anchoTot - PADX}" y2="\${yr}" stroke="var(--tinta-3)" stroke-width="1.6"/>\`;
  }

  // Vínculos, agrupados por padre y columna: una espina vertical con un pie a
  // cada caja, que es como los dibuja el organigrama oficial.
  const grupos = new Map();
  for (const [id, c] of cajas) {
    const p = N[id].padre;
    if (!cajas.has(p)) continue;
    const key = p + "|" + c.calle + "|" + c.col;
    (grupos.get(key) || grupos.set(key, []).get(key)).push(id);
  }
  for (const [key, miembros] of grupos) {
    const p = key.split("|")[0];
    const pc = cajas.get(p);
    const hijos = miembros.map((id) => cajas.get(id)).sort((a, b) => a.y - b.y);
    const punteado = N[miembros[0]].dashed || calleDe(miembros[0], cajaRaiz) === FUERA;
    const trazo = \`stroke="var(--linea)" stroke-width="1.4" fill="none"\${punteado ? ' stroke-dasharray="4 3"' : ""}\`;
    const px = pc.x + pc.w / 2, py = anclaPie(p, pc);
    const bus = hijos[0].y - CALLE_SEP / 2;
    // Si el hijo está más de una calle abajo, el trazo recto le pasaría por
    // encima a las cajas del medio: se lo manda por el canal de la izquierda.
    const salta = calles.indexOf(hijos[0].calle) - calles.indexOf(pc.calle) > 1;
    if (!salta && hijos.length === 1 && Math.abs(hijos[0].x + hijos[0].w / 2 - px) < 1) {
      lineas += \`<path d="M\${px} \${py} V\${hijos[0].y}" \${trazo}/>\`;
      continue;
    }
    const sx = hijos[0].x - (COL - ANCHO) / 2;
    const ids = miembros.slice().sort((a, b) => cajas.get(a).y - cajas.get(b).y);
    const ultima = ids[ids.length - 1];
    lineas += \`<path d="M\${px} \${py} V\${bus} H\${sx} V\${anclaAlto(ultima, cajas.get(ultima))}" \${trazo}/>\`;
    for (const k of ids) lineas += \`<path d="M\${sx} \${anclaAlto(k, cajas.get(k))} H\${cajas.get(k).x}" \${trazo}/>\`;
  }

  let s = fondo + lineas;
  for (const [id, c] of cajas) s += tarjetaSVG(id, c);
  if (interno) return s;
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${anchoTot} \${altoTot}" width="\${anchoTot}" height="\${altoTot}" role="img" aria-label="Organigrama de \${esc(rotulo)}">\${s}</svg>\`;
}
function dibujar(hoja) {
  cajaRaiz = hoja.id; pliego = false;
  return svgDe(disponer(hoja.id, hoja.ids), hoja.nombre);
}

function render() {
  $("#hojas").innerHTML = D.hojas.map((h) => \`
    <section class="hoja" id="h-\${esc(h.id)}">
      <div class="hoja-tit"><h2>\${esc(h.nombre)}</h2><span>\${h.ids.length} área\${h.ids.length === 1 ? "" : "s"}</span></div>
      <div class="lienzo">\${dibujar(h)}</div>
    </section>\`).join("");
  document.querySelectorAll(".tarjeta").forEach((g) => {
    g.addEventListener("click", () => elegir(g.dataset.id));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(g.dataset.id); } });
  });
}

// ── Panel ──────────────────────────────────────────────────────────────
let sel = null;
const editados = new Set();

function panelVacio() {
  $("#panel").innerHTML = \`<h3>Ninguna área elegida</h3>
    <p class="panel-vacio">Tocá una tarjeta para ver de quién depende, qué áreas tiene a cargo y sus
    responsabilidades primarias. También podés buscar por nombre, sigla o titular.</p>
    <p class="aviso">El nombre y el titular se pueden corregir acá mismo. Los cambios quedan en esta
    pestaña hasta que uses <b>Copiar JSON</b> o <b>Guardar copia</b>.</p>\`;
}

function elegir(id) {
  sel = id;
  const n = N[id];
  const [etq, bg, fg] = rango(n.tipo);
  const f = D.funciones[id];
  const kids = (n.hijos || []).filter((k) => N[k]);
  let h = \`<span class="rango" style="background:\${bg};color:\${fg}">\${esc(etq)}</span>
    <h3 id="p-nombre" style="margin-top:9px">\${esc(n.nombre)}</h3>
    <div class="sig">\${esc(id)}</div>\`;
  h += \`<div class="campo"><label for="f-nombre">Nombre del área</label><input id="f-nombre" value="\${esc(n.nombre)}"></div>\`;
  h += \`<div class="campo"><label for="f-titular">Titular</label><input id="f-titular" value="\${esc(n.titular)}" placeholder="Sin titular registrado"></div>\`;
  if (n.padre && N[n.padre]) {
    h += \`<div class="campo"><label>Depende de</label><button type="button" class="enlace" data-ir="\${esc(n.padre)}">\${esc(N[n.padre].nombre)}</button></div>\`;
  }
  if (kids.length) {
    h += \`<div class="campo"><label>Áreas a cargo (\${kids.length})</label><div class="lista">\` +
      kids.map((k) => \`<button type="button" class="enlace" data-ir="\${esc(k)}">\${esc(N[k].nombre)}</button>\`).join("") + "</div></div>";
  }
  if (editados.has(id)) h += \`<span class="editado">Editado en esta pestaña — sin corroborar</span>\`;
  if (f && (f.responsabilidad || f.objetivos)) {
    h += '<div class="func">';
    if (f.responsabilidad) h += \`<h4>Responsabilidades primarias</h4><p>\${esc(f.responsabilidad)}</p>\`;
    if (f.objetivos) h += \`<h4>Objetivos y acciones</h4><p>\${esc(f.objetivos)}</p>\`;
    if (f.fuente) h += \`<p class="fuente">Fuente: \${esc(f.fuente)}</p>\`;
    h += "</div>";
  } else {
    h += \`<div class="func"><p class="fuente">Sin misiones y funciones registradas para esta área.</p></div>\`;
  }
  $("#panel").innerHTML = h;
  $("#panel").querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => { elegir(b.dataset.ir); irA(b.dataset.ir); }));
  $("#f-nombre").addEventListener("input", (e) => cambiar(id, "nombre", e.target.value));
  $("#f-titular").addEventListener("input", (e) => cambiar(id, "titular", e.target.value));
}

function cambiar(id, campo, valor) {
  N[id][campo] = valor;
  editados.add(id);
  const hoja = D.hojas.find((h) => h.ids.includes(id));
  if (hoja) {
    const g = document.querySelector(\`#h-\${CSS.escape(hoja.id)} [data-id="\${CSS.escape(id)}"]\`);
    if (g) {
      const { cajas } = disponer(hoja.id, hoja.ids);
      const c = cajas.get(id);
      if (c) g.outerHTML = tarjetaSVG(id, c);
      const nuevo = document.querySelector(\`#h-\${CSS.escape(hoja.id)} [data-id="\${CSS.escape(id)}"]\`);
      if (nuevo) {
        nuevo.addEventListener("click", () => elegir(id));
        nuevo.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(id); } });
      }
    }
  }
  if ($("#p-nombre") && campo === "nombre") $("#p-nombre").textContent = valor;
}

function irA(id) {
  const hoja = D.hojas.find((h) => h.ids.includes(id));
  if (!hoja) return;
  const sec = document.getElementById("h-" + hoja.id);
  if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  const g = document.querySelector(\`#h-\${CSS.escape(hoja.id)} [data-id="\${CSS.escape(id)}"]\`);
  if (g) { g.focus({ preventScroll: true }); }
}

// ── Buscador ───────────────────────────────────────────────────────────
const sinAcento = (s) => String(s).normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
const indice = Object.keys(N).map((id) => ({ id, k: sinAcento(N[id].nombre + " " + id + " " + N[id].titular) }));

$("#q").addEventListener("input", (e) => {
  const q = sinAcento(e.target.value.trim());
  const caja = $("#res");
  if (q.length < 2) { caja.hidden = true; caja.innerHTML = ""; return; }
  const hits = indice.filter((x) => x.k.includes(q)).slice(0, 40);
  caja.hidden = false;
  caja.innerHTML = hits.length
    ? hits.map((x) => \`<button type="button" data-id="\${esc(x.id)}"><span class="sig">\${esc(x.id)}</span> \${esc(N[x.id].nombre)}\${N[x.id].titular ? \`<br><span class="don">\${esc(N[x.id].titular)}</span>\` : ""}</button>\`).join("")
    : \`<p class="vacio">Sin coincidencias para “\${esc(e.target.value.trim())}”.</p>\`;
  caja.querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => {
    elegir(b.dataset.id); irA(b.dataset.id); caja.hidden = true; $("#q").value = "";
  }));
});
document.addEventListener("click", (e) => { if (!e.target.closest(".buscador")) $("#res").hidden = true; });

$("#ir").innerHTML = D.hojas.map((h) => \`<option value="\${esc(h.id)}">\${esc(h.nombre)}</option>\`).join("");
$("#ir").addEventListener("change", (e) => document.getElementById("h-" + e.target.value).scrollIntoView({ behavior: "smooth", block: "start" }));

// ── Salida ─────────────────────────────────────────────────────────────
// Reconstruye data/organigrama.json con su forma y su formato, para que el
// archivo que sale de acá se pueda commitear sin reordenar nada.
function aOrganigrama() {
  const arma = (id) => {
    const n = N[id];
    const o = { id, nombre: n.nombre, titular: n.titular, tipo: n.tipo };
    if (n.dashed) o.dashed = true;
    o.children = (n.hijos || []).map(arma);
    return o;
  };
  return JSON.stringify(arma(D.raiz), null, 2) + "\\n";
}

$("#copiar").addEventListener("click", async (e) => {
  const txt = aOrganigrama();
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(txt);
    btn.textContent = editados.size ? \`Copiado · \${editados.size} edición\${editados.size === 1 ? "" : "es"}\` : "Copiado";
  } catch {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    btn.textContent = "Seleccionado: copialo con Ctrl+C";
    setTimeout(() => ta.remove(), 15000);
  }
  setTimeout(() => { btn.textContent = "Copiar JSON"; }, 4000);
});

$("#bajar").addEventListener("click", () => {
  document.getElementById("datos").textContent = JSON.stringify(D).replace(/</g, "\\\\u003c");
  const blob = new Blob(["<!doctype html>\\n" + document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Organigrama_GCBA_" + D.generado + ".html";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

// Antes de imprimir hay que cerrar el buscador: su menú tapa la primera hoja.
$("#imprimir").addEventListener("click", () => { $("#res").hidden = true; window.print(); });

// Pliego: el árbol entero en un solo dibujo, sin cortar en las otras hojas.
// Sirve para plotter o imprenta; en A3 habría que mosaiquearlo.
function resolverVars(svg) {
  const cs = getComputedStyle(document.documentElement);
  return svg.replace(/var\((--[a-z0-9-]+)\)/g, (_, v) => cs.getPropertyValue(v).trim() || "#8894a8");
}
$("#pliego").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  btn.textContent = "Armando…";
  setTimeout(() => {
    // Las 108 hojas apiladas en un dibujo solo. No se arma con un único árbol
    // porque las calles son por rango: las direcciones generales de un
    // organismo fuera de nivel caerían por encima del organismo mismo.
    pliego = true;
    const SEP = 96;
    let y = 0, anchoTot = 0;
    const partes = [];
    for (const h of D.hojas) {
      cajaRaiz = h.id;
      const d = disponer(h.id, h.ids);
      partes.push({ h, d, y });
      anchoTot = Math.max(anchoTot, d.anchoTot);
      y += d.altoTot + SEP;
    }
    const altoTot = y - SEP + 40;
    let cuerpo = "";
    for (const { h, d, y: yy } of partes) {
      cajaRaiz = h.id;
      cuerpo += \`<text x="16" y="\${yy + 26}" font-family="var(--display)" font-size="21" font-weight="700" fill="var(--tinta)">\${esc(h.nombre)}</text>\`;
      cuerpo += \`<svg x="0" y="\${yy + 38}" width="\${d.anchoTot}" height="\${d.altoTot}" viewBox="0 0 \${d.anchoTot} \${d.altoTot}">\${svgDe(d, h.nombre, true)}</svg>\`;
    }
    const svg = resolverVars(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${anchoTot} \${altoTot}" width="\${anchoTot}" height="\${altoTot}" role="img" aria-label="Organigrama completo del Gobierno de la Ciudad Autónoma de Buenos Aires">\${cuerpo}</svg>\`);
    pliego = false;
    const mm = (u) => Math.round(u * 25.4 / 96);
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\\n' + svg], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Organigrama_GCBA_pliego_" + D.generado + ".svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    btn.textContent = \`\${mm(anchoTot)} × \${mm(altoTot)} mm\`;
    setTimeout(() => { btn.textContent = "Pliego SVG"; }, 6000);
  }, 20);
});

render();
panelVacio();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, "visor.html"), html);
console.log(`visor.html — ${total} áreas · ${ordenHojas.length} hojas · ${conFunciones} con funciones · ${(html.length / 1024).toFixed(0)} KB`);
