# Estado del proyecto — Organigrama GCBA

> Resumen de handoff para retomar en otra sesión. Última actualización: 2026-06-19.

## Qué es
App web de **organigrama del Gobierno de la Ciudad de Buenos Aires (GCBA)**: visor +
editor interactivo, con un pipeline que mantiene los datos al día desde el **Boletín
Oficial (BOCBA)** y una herramienta para reconstruir el organigrama desde un **PDF**.

## Dónde vive
- **Repo (privado):** `lubelrivero-design/Organigrama-GCBA`. Rama principal: `main`.
- **App publicada:** GitHub Pages → `https://lubelrivero-design.github.io/Organigrama-GCBA/`
  (deploy automático en cada push a `main`, workflow `.github/workflows/deploy-pages.yml`).
- **Rama de desarrollo de features del visor:** `claude/nifty-gauss-qja9b`
  (los fixes del editor se hicieron ahí y se mergearon a `main` vía PRs).
- Todo es **un solo archivo**: `index.html` (app React + editor d3, sin build).

## Datos
- **`data/organigrama.json`** = fuente de verdad del organigrama (árbol: `id`, `nombre`,
  `tipo`, `titular`, `dashed`, `children`). La app lo carga por `fetch` (fallback al
  `INITIAL` embebido en `index.html` para file://). 
- **Estado actual:** **517 áreas**, reconstruidas desde el PDF oficial
  `docs/Organigrama_GCBA_2026.pdf` (18/6/2026).
- `data/cambios-pendientes.json` = índice de PRs del Boletín pendientes (lo lee el panel
  de la app). `data/boletin/<fecha>.md` = auditoría de cada corrida.
- **`APP_VERSION`** (en `index.html`, ~línea 2805): subir su valor invalida el caché
  local de los usuarios y fuerza recarga desde `data/organigrama.json`. Hoy: `20260619`.

## Visor / editor (todo implementado y mergeado)
- Colores unificados visor/editor/PDF: JG/VJG rojo `#9B1C1C`, Ministerio naranja
  `#F5871F`, Secretaría amarillo `#FFD400`, Subsecretaría azul `#004F86`, DG/GG/GO verde
  `#268948`, Org. desc. gris `#E4E9ED`, custom violeta `#5B21B6`. Texto oscuro en fondos claros.
- **Tamaño de letra por nodo:** control "Texto:" en la barra (aplica a seleccionados o
  todos; 0 = automático). Guardado en `edPositions[id].fs`.
- **Nodos con nombre largo** se ensanchan (helper `defNodeW`).
- **Líneas:** ruteo ortogonal automático estilo Canva. Cada línea se mueve de a una
  (altura por línea + tronco vertical por línea). **Snap** a otras líneas/nodos;
  **Alt+arrastrar** o estar a <16px del origen = sin pegar (para despegar). Punteadas
  (fuera de nivel) no se pegan con rellenas. Sin waypoints libres.
- Nodos **"fuera de nivel" (dashed)** no despliegan su subárbol en la vista del padre
  (se ven como hoja; se editan seleccionándolos como área).
- El **export A3/PDF** respeta el ruteo manual (altura + tronco) del editor.

## Pipeline del Boletín → Organigrama (automático)
- **`.github/workflows/boletin.yml`**: cron L-V ~9 ART + ejecución manual.
  - `scripts/boletin/run.mjs`: baja el PDF del día del BOCBA (URL
    `…/documentos/boletines/AAAA/MM/AAAAMMDD.pdf`), filtra Poder Ejecutivo
    (designaciones/ceses/estructura), llama a **Claude (tool use)** con el organigrama en
    `system` (prompt caching) para extraer operaciones (`set_titular`, `create_node`,
    `remove_node`, `move_node`, `rename`), aplica el diff y **sube la rama `boletin/<fecha>`**.
  - Intenta crear el PR automáticamente (`gh pr create`, asignado a `lubelrivero-design`);
    si el repo no lo permite, deja el link. Regenera `data/cambios-pendientes.json`.
  - **Backfill:** correr el workflow con inputs `desde`/`hasta` (YYYY-MM-DD) → recorre el
    rango y junta todo en un PR `boletin/backfill-<desde>_<hasta>`. Resiliente (si la API
    corta, guarda lo parcial).
- **`.github/workflows/boletin-indice.yml`**: al cerrar/mergear un PR, regenera el índice
  de pendientes (limpia el panel).
- **Panel en la app:** botón flotante "📥 Boletín: N pendientes" → lee
  `data/cambios-pendientes.json` → cada cambio con botón "Aprobar en GitHub →" que abre el
  PR (donde está el Merge). Sin token. Aprobar = mergear el PR → deploy.

## Importador desde PDF (one-shot, reutilizable)
- **`.github/workflows/importar-pdf.yml`** (manual): renderiza el PDF (poppler) y manda
  cada página a **Claude visión** (`scripts/importar-pdf/run.mjs`) para leer cajas
  (sigla=id, nombre, titular, tipo, fuera-de-nivel) y la **jerarquía por las líneas**;
  ensambla el árbol, escribe `data/organigrama.json` + `docs/import-report.md` (dudas:
  colisiones de sigla, huérfanos) y abre PR.
- Inputs: `pdf` (default `docs/Organigrama_GCBA_2026.pdf`), `modelo`
  (default `claude-opus-4-8`; más barato `claude-sonnet-4-6`), `dpi` (150).
- Para actualizar el organigrama desde un PDF nuevo: reemplazar `docs/...pdf` y correr el
  workflow.

## Configuración del repo (importante)
- **Secret `ANTHROPIC_API_KEY`**: requerido por los pipelines. ⚠️ La cuenta tuvo límite
  de uso; controlar saldo/límite en `console.anthropic.com` (Billing / Limits).
- **Variable `CLAUDE_MODEL`** (opcional): modelo del pipeline del Boletín (se eligió
  `claude-sonnet-4-6` para abaratar; el importador usa Opus por precisión).
- **Settings → Actions → "Allow GitHub Actions to create and approve pull requests"**:
  habilitado → los PRs del Boletín se crean solos. (Alternativa: secret `GH_PAT`.)
- Notificaciones: los PRs del Boletín se asignan a `lubelrivero-design` (llega mail).

## Flujo de trabajo diario (para el usuario)
1. Llega un mail cuando hay cambios del Boletín (o aparece el panel en la app).
2. Abrir el PR desde el panel/mail, revisar el diff + la cita del Boletín.
3. **Merge** = aprobar y publicar. **Close** = descartar. Nada se aplica sin aprobar.

## Pendientes / próximos pasos posibles
- Revisar el organigrama de 517 áreas en la app y reordenar el layout (se reseteó con el
  import; el ruteo automático ayuda).
- Confirmar/corregir áreas dudosas que marque cada import (`docs/import-report.md`).
- Si se quiere, afinar el filtro de palabras clave o el prompt del Boletín
  (`scripts/boletin/run.mjs`).
- Opcional: PR 100% automático del Boletín ya está si está el toggle/`GH_PAT`.

## Notas / limitaciones honestas
- El PDF no tiene capa de texto → la lectura es por **visión**; ninguna IA acierta el
  100%, por eso cada import deja un **reporte de dudas** y todo pasa por **PR**.
- Reaplicar designaciones viejas (backfill amplio) puede pisar titulares actuales con
  datos más viejos → usar rangos cortos y revisar el PR.
- El repo es **privado**: la app no puede consultar la API de GitHub sin token; por eso el
  panel lee un archivo (`data/cambios-pendientes.json`) que el robot mantiene.
