# Pipeline Boletín Oficial → Organigrama

Lee el Boletín Oficial de la Ciudad (BOCBA), detecta cambios del Poder Ejecutivo
(designaciones, ceses, creación/disolución/cambios de estructura) y propone
actualizaciones a `data/organigrama.json` vía un Pull Request para revisión.

## Cómo funciona

1. **Fetch** — baja el PDF del día: `…/documentos/boletines/AAAA/MM/AAAAMMDD.pdf`.
2. **Filtro** — extrae texto y se queda con los párrafos del Poder Ejecutivo
   (por palabras clave: "Desígnase", "Cese", "Créase", "Modifícase la estructura"…).
3. **Extracción** — Claude (con *tool use* / salida estructurada) devuelve una
   lista de operaciones: `set_titular`, `create_node`, `remove_node`,
   `move_node`, `rename`, cada una con norma, cita y nivel de confianza.
   El organigrama actual viaja en `system` con **prompt caching**, así se
   reutiliza entre chunks sin re-cobrar tokens.
4. **Diff + PR** — aplica las operaciones a una copia del organigrama y abre un
   PR con el JSON actualizado + un resumen (`data/boletin/AAAA-MM-DD.md`).

## Disparadores

- **Automático:** cron de lunes a viernes (ver `.github/workflows/boletin.yml`).
- **Manual:** Actions → *Boletín → Organigrama* → *Run workflow* (podés indicar una fecha).

## Requisitos

- Secret del repo **`ANTHROPIC_API_KEY`**.
- (Opcional) Variable del repo **`CLAUDE_MODEL`** para elegir modelo.
  Por defecto `claude-opus-4-8`. Para abaratar, poné `claude-sonnet-4-6`.

## PR automático

El workflow **intenta crear el PR solo**. Si el repo no se lo permite, sube la
rama igual y deja un link para abrirlo a mano. Para que sea 100% automático,
elegí **una** de estas opciones (una sola vez):

- **Opción A (más simple):** Settings → Actions → General → *Workflow permissions*
  → marcá **"Allow GitHub Actions to create and approve pull requests"** y
  **"Read and write permissions"**. Guardá.
- **Opción B (PAT):** creá un *fine-grained token* con permisos
  *Contents: Read and write* y *Pull requests: Read and write* sobre este repo,
  y guardalo como secret **`GH_PAT`**. El workflow lo usa si existe.

## Probar localmente

```bash
cd scripts/boletin
npm install
ANTHROPIC_API_KEY=sk-ant-... FECHA=2026-06-17 DUMP_TEXT=1 node run.mjs
```

Con `DUMP_TEXT=1` se guardan `boletin-<fecha>.txt` (texto completo) y
`…-filtrado.txt` (lo que se le manda al modelo) para inspeccionar el filtrado.

## Importante

- **Revisión humana obligatoria:** nada se aplica solo. El PR es la instancia de
  control — revisá cada cambio contra la cita del Boletín antes de mergear.
- Los cambios que el modelo no pudo mapear a un id existente quedan listados como
  "a revisar" en el resumen, sin aplicarse.
