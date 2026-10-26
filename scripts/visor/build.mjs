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
const UMBRAL_HOJA = 15;
const hojas = [org.id];
for (const c of hijos(org.id)) if (hijos(c).length) hojas.push(c);
for (const c of hijos("MJGGC")) if (hijos(c).length) hojas.push(c);
for (const id of nodos.keys()) {
  if (!hojas.includes(id) && descendientes(id) >= UMBRAL_HOJA) hojas.push(id);
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
  --jg:#9b1c1c; --min:#f5871f; --sec:#ffd400; --ss:#004f86; --dg:#268948;
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
  --orgc:#56637a; --orgc-fg:#eef2f8; --edit:#fbbf24; --edit-bg:#3b2f14;
  --sombra:0 1px 2px #0006, 0 8px 24px #0004;
  color-scheme:dark;
}}
:root[data-theme="dark"]{
  --tinta:#e8ecf3; --tinta-2:#aab6cb; --tinta-3:#7f8da6;
  --papel:#10151f; --hoja:#19202e; --linea:#2c3647; --linea-2:#232c3b;
  --acento:#6cb6e8; --acento-suave:#1b2a3b; --marca:#ffd400;
  --orgc:#56637a; --orgc-fg:#eef2f8; --edit:#fbbf24; --edit-bg:#3b2f14;
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
.lienzo svg{display:block;height:auto;max-width:100%;min-width:100%}
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
@media print{.barra,.panel,.pie{display:none}.cuerpo{display:block;padding:0}.hoja{break-inside:avoid;box-shadow:none;border-color:#bbb}}
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
      <button type="button" class="btn pri" id="bajar">Guardar copia</button>
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

$("#leyenda").innerHTML = [["JG", "Jefatura"], ["MIN", "Ministerio"], ["SEC", "Secretaría"], ["SS", "Subsecretaría"], ["DG", "Dirección General"], ["ORG", "Organismo fuera de nivel"]]
  .map(([t, n]) => \`<span><i style="background:\${rango(t)[1]}"></i>\${n}</span>\`).join("");

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

// ── Disposición: árbol de izquierda a derecha ───────────────────────────
// Vertical y no horizontal a propósito: con 42 áreas y hasta cuatro niveles,
// un árbol de arriba hacia abajo se va de ancho y obliga a hacer scroll
// lateral. Así cada nivel es una columna y los hermanos bajan, que es como se
// lee una lista.
const ANCHO = 206, COL = 250, ALTO_MIN = 54, FILA = 10, PADX = 18, PADY = 18;

function disponer(raiz, ids) {
  const dentro = new Set(ids);
  const cajas = new Map();
  let y = PADY;
  function alto(id) {
    const n = N[id];
    const t = ajustar(n.nombre, ANCHO - 20, 42, 12.5, 8.5, "600").lineas.length;
    return Math.max(ALTO_MIN, 16 + t * 15 + (n.titular ? 15 : 0));
  }
  function rec(id, prof) {
    const kids = (N[id].hijos || []).filter((k) => dentro.has(k) && k !== id);
    const h = alto(id);
    const propio = y;
    if (!kids.length || (esHojaPropia(id) && id !== raiz)) {
      cajas.set(id, { x: PADX + prof * COL, y: propio, w: ANCHO, h, prof });
      y = propio + h + FILA;
      return { centro: propio + h / 2 };
    }
    const cen = kids.map((k) => rec(k, prof + 1).centro);
    const mid = (cen[0] + cen[cen.length - 1]) / 2;
    cajas.set(id, { x: PADX + prof * COL, y: Math.max(propio, mid - h / 2), w: ANCHO, h, prof });
    return { centro: cajas.get(id).y + h / 2 };
  }
  rec(raiz, 0);
  const anchoTot = Math.max(...[...cajas.values()].map((c) => c.x + c.w)) + PADX;
  const altoTot = Math.max(...[...cajas.values()].map((c) => c.y + c.h)) + PADY;
  return { cajas, anchoTot, altoTot };
}
const hojaIds = new Set(D.hojas.map((h) => h.id));
const esHojaPropia = (id) => hojaIds.has(id);

// ── Dibujo ─────────────────────────────────────────────────────────────
function tarjetaSVG(id, c) {
  const n = N[id];
  const [, bg, fg] = rango(n.tipo);
  const hTit = n.titular ? c.h - 15 : c.h;
  const t = ajustar(n.nombre, c.w - 20, hTit - 14, 12.5, 8.5, "600");
  const y0 = c.y + (hTit - t.lineas.length * t.fs * 1.22) / 2 + t.fs * 0.92;
  const guion = n.dashed ? ' stroke-dasharray="5 3"' : "";
  let s = \`<g class="tarjeta" data-id="\${esc(id)}" tabindex="0" role="button" aria-label="\${esc(n.nombre)}">\`;
  s += \`<title>\${esc(n.nombre)}\${n.titular ? " — " + esc(n.titular) : ""}</title>\`;
  s += \`<rect class="marco" x="\${c.x}" y="\${c.y}" width="\${c.w}" height="\${c.h}" rx="6" fill="\${bg}" stroke="#00000022"\${guion}/>\`;
  s += \`<text font-family="var(--texto)" font-size="\${t.fs}" font-weight="600" fill="\${fg}" text-anchor="middle">\`;
  s += t.lineas.map((l, i) => \`<tspan x="\${c.x + c.w / 2}" y="\${y0 + i * t.fs * 1.22}">\${esc(l)}</tspan>\`).join("");
  s += "</text>";
  if (n.titular) {
    s += \`<rect x="\${c.x}" y="\${c.y + c.h - 15}" width="\${c.w}" height="15" fill="#00000026"/>\`;
    const tt = ajustar(n.titular, c.w - 14, 13, 9.5, 7, "400");
    s += \`<text x="\${c.x + c.w / 2}" y="\${c.y + c.h - 4.6}" font-family="var(--texto)" font-size="\${tt.fs}" fill="\${fg}" fill-opacity=".92" text-anchor="middle">\${esc(tt.lineas[0])}</text>\`;
  }
  if (esHojaPropia(id) && id !== cajaRaiz) {
    s += \`<circle cx="\${c.x + c.w - 11}" cy="\${c.y + 11}" r="7.5" fill="#ffffff" fill-opacity=".85"/>\`;
    s += \`<text x="\${c.x + c.w - 11}" y="\${c.y + 14.6}" font-size="10" font-weight="700" fill="#101e37" text-anchor="middle">↗</text>\`;
  }
  return s + "</g>";
}

let cajaRaiz = null;
function dibujar(hoja) {
  cajaRaiz = hoja.id;
  const { cajas, anchoTot, altoTot } = disponer(hoja.id, hoja.ids);
  let s = "";
  for (const [id, c] of cajas) {
    const p = N[id].padre;
    if (!cajas.has(p)) continue;
    const pc = cajas.get(p);
    const x1 = pc.x + pc.w, y1 = pc.y + pc.h / 2, x2 = c.x, y2 = c.y + c.h / 2;
    const xm = x1 + (COL - ANCHO) / 2;
    s += \`<path d="M\${x1} \${y1} H\${xm} V\${y2} H\${x2}" fill="none" stroke="var(--linea)" stroke-width="1.5"/>\`;
  }
  for (const [id, c] of cajas) s += tarjetaSVG(id, c);
  return \`<svg viewBox="0 0 \${anchoTot} \${altoTot}" width="\${anchoTot}" height="\${altoTot}" role="img" aria-label="Organigrama de \${esc(hoja.nombre)}">\${s}</svg>\`;
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

render();
panelVacio();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, "visor.html"), html);
console.log(`visor.html — ${total} áreas · ${ordenHojas.length} hojas · ${conFunciones} con funciones · ${(html.length / 1024).toFixed(0)} KB`);
