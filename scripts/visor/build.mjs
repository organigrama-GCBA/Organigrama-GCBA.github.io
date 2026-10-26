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
// Las hojas son las 32 del organigrama oficial, en su mismo orden:
// docs/Organigrama_GCBA_2026.pdf, una página por jurisdicción y por organismo
// fuera de nivel con estructura propia. Se fija la lista en vez de deducirla
// con un umbral para que el impreso tenga exactamente las mismas páginas que
// el modelo.
const hojas = [
  "JG", "PG", "CDNNYA", "SGCBA", "URFVI", "VJG", "APRA", "COPIDIS", "UPEEI",
  "MJGGC", "ASINF", "IDECBA", "MHFGC", "AGIP", "MJGC", "AGC", "MSEGC", "MSGC",
  "EAIT", "MEDGC", "MDECGC", "ENTUR", "MCGC", "MDHYHGC", "MEPHUGC", "MMIGC",
  "SECGE", "SECLYT", "SECCO", "SECAE", "SECGVC", "SECME",
];
const faltantes = hojas.filter((id) => !nodos.has(id));
if (faltantes.length) {
  console.error(`Estas hojas del organigrama oficial no existen en los datos: ${faltantes.join(", ")}`);
  process.exit(1);
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

const ordenHojas = hojas;

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
/* Como el organigrama oficial: la caja mide siempre lo mismo y la hoja crece
   lo que haga falta. En docs/Organigrama_GCBA_2026.pdf el ancho es fijo
   —843,97 pt, 297,7 mm— y el alto va de 960 a 2054 pt según la página. Así la
   letra sale igual de grande en las 32, en vez de achicarse en las cargadas.
   Las medidas de cada hoja se calculan y se inyectan al imprimir. */
@page{size:297.7mm 472.6mm;margin:9mm}
@media print{
  :root{--papel:#fff;--hoja:#fff;--linea:#9aa6b8;--linea-2:#c6cedb;--tinta:#101e37;--tinta-2:#3c4a63;--tinta-3:#6b7892}
  body{background:#fff;font-size:10pt}
  /* Sin portada ni índice: el oficial arranca directo en el organigrama de
     gobierno, y el impreso tiene que tener sus mismas 32 páginas. */
  .barra,.panel,.pie,.intro,#res,.portada{display:none!important}
  .cuerpo{display:block;padding:0}
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
  .lienzo svg{width:var(--ancho-impreso);height:var(--alto-impreso);min-width:0;max-width:none;max-height:none}
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
const ANCHO = 132, COL = 168, ALTO_MIN = 34, FILA = 11, PADX = 14, PADY = 14;
const CALLE_SEP = 34, CANAL = 10;
const H_SIGLA = 13, H_TITULAR = 21, MAX_PILA = 6;

const RANGO_CALLE = { JG: 1, VJG: 1, MIN: 1, SEC: 1, SS: 2, DG: 3, GG: 3, GO: 4, SGO: 4 };
const FUERA = 9;
const ROTULO_CALLE = { 0: "", 1: "MINISTERIO", 2: "SUBSECRETARÍA", 3: "DIRECCIÓN GENERAL", 4: "GERENCIA", 9: "FUERA DE NIVEL" };
const esUAI = (id) => /^unidad de auditor[íi]a interna/i.test(N[id].nombre);
// Una adjunta de la cabecera —\"PG Adjunta Dictámenes\", la Vicepresidencia del
// Consejo— figura como organismo en los datos, pero no está fuera de nivel:
// es un escalón intermedio del que cuelgan direcciones generales. Si fuera a
// la calle de abajo, sus direcciones quedarían por encima de ella.
let intermedios = new Set();
function calleDe(id, raiz) {
  if (id === raiz) return 0;
  if (intermedios.has(id)) return 1;
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
  // Una columna propia se abre solo si debajo hay OTRA calle: una
  // subsecretaría la abre porque de ella cuelgan direcciones generales, pero
  // una dirección general con su adjunta no, porque la adjunta es de su misma
  // calle. Así lo dibuja el oficial: las cinco direcciones de la Subsecretaría
  // de Hacienda —adjuntas incluidas— van en una sola columna.
  const abreCol = (id) => {
    const b = calleDe(id, raiz);
    let hay = false;
    (function rec(x) {
      if (hay || corta(x)) return;
      for (const k of hijosEn(x)) {
        const c = calleDe(k, raiz);
        if (c !== FUERA && c > b) { hay = true; return; }
        rec(k);
      }
    })(id);
    return hay;
  };
  const linajeDe = (x) => {
    const out = [x];
    const b = calleDe(x, raiz);
    (function rec(y) {
      for (const k of corta(y) ? [] : hijosEn(y)) if (calleDe(k, raiz) === b) { out.push(k); rec(k); }
    })(x);
    return out;
  };
  intermedios = new Set(
    hijosEn(raiz).filter((k) => !corta(k) && hijosEn(k).length &&
      (N[k].dashed || ["ORG", "OTRO"].includes(N[k].tipo)) && !esUAI(k)),
  );
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
    const ramas = normales.filter(abreCol);
    const hojas = normales.filter((x) => !abreCol(x)).flatMap(linajeDe);
    const tramos = ramas.map(colocar);
    // Una pila muy larga deja la hoja alta y flaca, y en A3 la letra se vuelve
    // ilegible: se la reparte en columnas, como hace el organigrama oficial
    // con los ministerios.
    if (hojas.length) {
      // Se agrupan por calle: una pila mezcla direcciones generales con
      // subsecretarías sin estructura, y cada una va a la suya.
      const porCalle = new Map();
      for (const x of hojas) {
        const c = calleDe(x, raiz);
        (porCalle.get(c) || porCalle.set(c, []).get(c)).push(x);
      }
      const trozos = Math.max(...[...porCalle.values()].map((v) => Math.ceil(v.length / MAX_PILA)));
      const cols = Array.from({ length: trozos }, () => cursor++);
      for (const [c, v] of porCalle) {
        const porColumna = Math.ceil(v.length / trozos);
        v.forEach((x, n) => poner(x, c, cols[Math.min(trozos - 1, Math.floor(n / porColumna))]));
      }
      for (const k of cols) tramos.push([k, k]);
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

  // Los fuera de nivel van todos juntos en la calle de abajo, pero cada uno
  // bajo la columna de su padre: así la punteada cae casi a plomo y se ve de
  // dónde cuelga. Repartirlos en orden de llegada hacía que las líneas
  // cruzaran media hoja y no se entendiera qué conectaba con qué.
  const ocupadas = new Map();
  for (const x of fuera) {
    const p = pos.get(N[x].padre);
    const base = p ? Math.round(p.k) : 0;
    let k = base, paso = 0;
    while ((ocupadas.get(k) || 0) >= MAX_PILA) { paso++; k = base + (paso % 2 ? Math.ceil(paso / 2) : -Math.ceil(paso / 2)); }
    ocupadas.set(k, (ocupadas.get(k) || 0) + 1);
    poner(x, FUERA, Math.max(0, k));
  }

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
// El trazo arranca por debajo de TODA la tarjeta, titular incluido: si salía
// del pie de la franja de sigla, bajaba por encima del nombre del titular.
const anclaPie = (id, c) => c.y + c.h;

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

  // Un padre se centra sobre sus hijas, así que puede quedar en media columna
  // y taparle el pasillo a otro trazo. En vez de confiar en la grilla, se
  // busca la vertical libre más cercana a la deseada.
  const todas = [...cajas.values()];
  // Sirve una vertical si pasa holgada de toda caja Y si los pies
  // horizontales que salen de ella tampoco rozan a nadie. No alcanza con "no
  // tocar": a tres unidades de una caja la línea se ve pegada a ella y parece
  // que la conecta. Se prueban primero los centros de los huecos entre
  // columnas, que es por donde tiene que ir.
  const CLARO = 14, SEP_LINEAS = 22;
  const verticales = [];          // las que ya se dibujaron, para no encimarse
  function pasilloLibre(xIdeal, y1, y2, pies = [], dePadre = null) {
    const a = Math.min(y1, y2), z = Math.max(y1, y2);
    const corta = (x1, yy, x2, saltar, claro) => todas.some((c) =>
      !saltar.has(c) && Math.max(x1, x2) > c.x - claro && Math.min(x1, x2) < c.x + c.w + claro &&
      yy > c.y + 1 && yy < c.y + c.h - 1);
    const sirve = (x, sep, claro) => {
      if (todas.some((c) => x > c.x - claro && x < c.x + c.w + claro && z > c.y && a < c.y + c.h)) return false;
      // Solo hay que separarse de las líneas de OTRO padre: dos trazos que
      // salen de la misma caja no se confunden entre sí, y obligarlos a
      // apartarse mandaba la punteada a dar un rodeo por el borde de la hoja.
      if (sep > 0 && verticales.some((v) => v.padre !== dePadre && Math.abs(v.x - x) < sep && z > v.a && a < v.z)) return false;
      return pies.every(({ caja, y }) => !corta(x, y, caja.x, new Set([caja]), claro));
    };
    const maxCol = Math.max(...todas.map((c) => (c.x - PADX - CANAL) / COL));
    const huecos = [];
    for (let k = 0; k <= Math.ceil(maxCol) + 1; k++) huecos.push(PADX + CANAL + k * COL - (COL - ANCHO) / 2);
    huecos.sort((p, q) => Math.abs(p - xIdeal) - Math.abs(q - xIdeal));
    // Siempre dentro del dibujo. Si no hay lugar, se afloja primero la
    // distancia a las otras líneas y después la holgura con las cajas; irse
    // del lienzo dejaba el trazo dibujado donde nadie lo ve.
    const adentro = (x) => x >= PADX / 2 && x <= anchoTot - PADX / 2;
    for (const [sep, claro] of [[SEP_LINEAS, CLARO], [SEP_LINEAS / 2, CLARO], [0, CLARO], [0, 6]]) {
      for (const x of huecos) if (adentro(x) && sirve(x, sep, claro)) return x;
      if (adentro(xIdeal) && sirve(xIdeal, sep, claro)) return xIdeal;
      for (let d = 2; d <= 3 * COL; d += 2) {
        if (adentro(xIdeal - d) && sirve(xIdeal - d, sep, claro)) return xIdeal - d;
        if (adentro(xIdeal + d) && sirve(xIdeal + d, sep, claro)) return xIdeal + d;
      }
    }
    return Math.min(Math.max(xIdeal, PADX / 2), anchoTot - PADX / 2);
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
  // Primero las líneas de estructura y después las punteadas: así la línea
  // firme se queda con el pasillo natural y la punteada busca otro, en vez de
  // terminar las dos encimadas.
  const ordenados = [...grupos].sort((a, b) => {
    const pa = calleDe(a[1][0], cajaRaiz) === FUERA || N[a[1][0]].dashed;
    const pb = calleDe(b[1][0], cajaRaiz) === FUERA || N[b[1][0]].dashed;
    return (pa ? 1 : 0) - (pb ? 1 : 0);
  });
  for (const [key, miembros] of ordenados) {
    const p = key.split("|")[0];
    const pc = cajas.get(p);
    const hijos = miembros.map((id) => cajas.get(id)).sort((a, b) => a.y - b.y);
    const punteado = N[miembros[0]].dashed || calleDe(miembros[0], cajaRaiz) === FUERA;
    // El id del área de la que sale queda en el trazo: sirve para comprobar
    // que dos líneas de padres distintos no terminen corriendo pegadas.
    const trazo = \`data-padre="\${esc(p)}" stroke="var(--linea)" stroke-width="1.4" fill="none"\${punteado ? ' stroke-dasharray="4 3"' : ""}\`;
    const px = pc.x + pc.w / 2, py = anclaPie(p, pc);
    // El trazo sale de la caja del padre y dobla enseguida, en el pasillo que
    // queda justo debajo de SU calle. Si bajara derecho hasta la altura del
    // hijo, atravesaría por el medio todas las cajas que tiene debajo en su
    // misma columna: era lo que pasaba con los organismos fuera de nivel, que
    // cuelgan del ministerio y se dibujan al pie de la hoja.
    const salida = yCalle.get(pc.calle) + altoCalle.get(pc.calle) + CALLE_SEP / 2;
    const salta = calles.indexOf(hijos[0].calle) - calles.indexOf(pc.calle) > 1;
    // Una adjunta va apilada justo debajo de su titular, en la misma columna y
    // en la misma calle: el trazo es un tramo corto y recto. Mandarlo por el
    // pasillo lo hacía bajar hasta el pie de la calle y volver a subir,
    // cruzando las cajas del medio.
    if (pc.calle === hijos[0].calle && pc.col === hijos[0].col) {
      for (const h of hijos) {
        lineas += \`<path d="M\${px} \${py} V\${h.y}" \${trazo}/>\`;
        verticales.push({ x: px, a: py, z: h.y, padre: p });
      }
      continue;
    }
    const primeroDeSuPila = hijos[0].y <= yCalle.get(hijos[0].calle) + 0.5;
    if (!salta && primeroDeSuPila && hijos.length === 1 && Math.abs(hijos[0].x + hijos[0].w / 2 - px) < 1) {
      lineas += \`<path d="M\${px} \${py} V\${hijos[0].y}" \${trazo}/>\`;
      verticales.push({ x: px, a: py, z: hijos[0].y, padre: p });
      continue;
    }
    // El pasillo vertical va en el espacio libre que hay a la izquierda de la
    // columna: todas las cajas miden ANCHO y la columna avanza de a COL, así
    // que esa franja está siempre vacía en todas las calles.
    const ids = miembros.slice().sort((a, b) => cajas.get(a).y - cajas.get(b).y);
    const ultima = ids[ids.length - 1];
    const pies = ids.map((k) => ({ caja: cajas.get(k), y: anclaAlto(k, cajas.get(k)) }));

    // Los organismos que dependen de la cabecera de la hoja se alcanzan por el
    // canal de afuera. Si la punteada bajara entre las columnas correría al
    // lado de una secretaría durante toda la hoja y parecería salir de ella:
    // era lo que pasaba con el Instituto de Estadística y Censos, que cuelga
    // de Jefatura de Gabinete y se leía como de la Secretaría Ordenamiento
    // Urbano. Por afuera no hay nada con qué confundirlo.
    // Por el margen va toda punteada de recorrido largo, no solo la de la
    // cabecera: si tiene que atravesar más de una calle, por adentro termina
    // dando un rodeo entre las columnas y pegándose a lo que encuentra.
    if (hijos[0].calle === FUERA && calles.indexOf(FUERA) - calles.indexOf(pc.calle) > 1) {
      // El bus va por DEBAJO de toda la fila, no por arriba: arriba corría a
      // diez unidades de la raya que separa los fuera de nivel, en paralelo a
      // ella durante toda la hoja, y se leía como una sola línea doble.
      // Abajo no hay nada.
      const bus = altoTot - 5;
      // El canal se corre hacia afuera hasta despegarse de cualquier otra
      // línea que ya baje por el margen.
      let ext = Math.min(...todas.map((c) => c.x)) - 26;
      while (verticales.some((v) => v.padre !== p && Math.abs(v.x - ext) < SEP_LINEAS && bus > v.a && salida < v.z)) ext -= 12;
      // El bus queda por debajo de la fila, así que la vertical sube hasta la
      // caja MÁS ALTA del grupo; si fuera hasta la más baja, los pies de las
      // de arriba quedarían sueltos.
      const arriba = anclaAlto(ids[0], cajas.get(ids[0]));
      const sx = pasilloLibre(hijos[0].x - (COL - ANCHO) / 2, bus, arriba, pies, p);
      lineas += \`<path d="M\${px} \${py} V\${salida} H\${ext} V\${bus} H\${sx} V\${arriba}" \${trazo}/>\`;
      for (const k of ids) lineas += \`<path d="M\${sx} \${anclaAlto(k, cajas.get(k))} H\${cajas.get(k).x}" \${trazo}/>\`;
      verticales.push({ x: px, a: py, z: salida, padre: p });
      verticales.push({ x: ext, a: salida, z: bus, padre: p });
      verticales.push({ x: sx, a: arriba, z: bus, padre: p });
      continue;
    }

    const sx = pasilloLibre(hijos[0].x - (COL - ANCHO) / 2, salida, anclaAlto(ultima, cajas.get(ultima)), pies, p);
    lineas += \`<path d="M\${px} \${py} V\${salida} H\${sx} V\${anclaAlto(ultima, cajas.get(ultima))}" \${trazo}/>\`;
    for (const k of ids) lineas += \`<path d="M\${sx} \${anclaAlto(k, cajas.get(k))} H\${cajas.get(k).x}" \${trazo}/>\`;
    verticales.push({ x: px, a: py, z: salida, padre: p });
    verticales.push({ x: sx, a: salida, z: anclaAlto(ultima, cajas.get(ultima)), padre: p });
  }

  let s = fondo + lineas;
  for (const [id, c] of cajas) s += tarjetaSVG(id, c);
  if (interno) return s;
  // Red de seguridad: el lienzo se estira hasta abarcar todo lo dibujado. Si
  // un trazo tuviera que salirse, se vería igual en vez de quedar recortado.
  const xs = [...(fondo + lineas).matchAll(/[MH](-?[\\d.]+)/g)].map((m) => +m[1]);
  const x0 = Math.min(0, ...xs.map((v) => v - 5));
  const x1 = Math.max(anchoTot, ...xs.map((v) => v + 5));
  const ancho = x1 - x0;
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="\${x0} 0 \${ancho} \${altoTot}" width="\${ancho}" height="\${altoTot}" role="img" aria-label="Organigrama de \${esc(rotulo)}">\${s}</svg>\`;
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

// Antes de imprimir se calcula el tamaño de cada hoja y se inyecta una regla
// @page por hoja. La escala es fija —la caja mide 35,3 mm, como en el
// oficial— así que la letra sale igual en las 32 y la hoja crece lo que haga
// falta. El ancho es 297,7 mm salvo en las hojas que no entran, que llevan el
// suyo.
const MM_POR_UNIDAD = 35.3 / ANCHO, MARGEN = 9, ANCHO_OFICIAL = 297.7;
function medidasDeImpresion() {
  const reglas = [];
  D.hojas.forEach((h, i) => {
    const d = disponer(h.id, h.ids);
    const anchoMM = d.anchoTot * MM_POR_UNIDAD, altoMM = d.altoTot * MM_POR_UNIDAD;
    const hoja = Math.max(ANCHO_OFICIAL, +(anchoMM + 2 * MARGEN).toFixed(1));
    const alto = +(altoMM + 2 * MARGEN + 14).toFixed(1);
    reglas.push(
      \`@page h\${i} { size: \${hoja}mm \${alto}mm; margin: \${MARGEN}mm }\`,
      \`#h-\${CSS.escape(h.id)} { page: h\${i} }\`,
      \`#h-\${CSS.escape(h.id)} .lienzo svg { --ancho-impreso: \${anchoMM.toFixed(1)}mm; --alto-impreso: \${altoMM.toFixed(1)}mm }\`,
    );
  });
  let est = document.getElementById("medidas-impresion");
  if (!est) { est = document.createElement("style"); est.id = "medidas-impresion"; document.head.appendChild(est); }
  est.textContent = "@media print{" + reglas.join("\\n") + "}";
}
$("#imprimir").addEventListener("click", () => { $("#res").hidden = true; medidasDeImpresion(); window.print(); });
medidasDeImpresion();

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
