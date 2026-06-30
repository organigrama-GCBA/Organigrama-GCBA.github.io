# Registro de análisis de decretos de estructura (PE-DEC-AJG)

Fuente: carpeta Drive de modificaciones de estructura (feb–jun 2026), provista por el usuario.
Método: se lee cada decreto (texto + anexo), se compara contra `data/organigrama.json`
(base reconstruido del PDF de junio 2026) y se corrige solo donde hay discrepancia.
Orden: del más viejo al más nuevo (número de decreto = orden cronológico).

> Nota clave: el base de junio es **más nuevo** que casi todos los decretos, así que la
> mayoría ya está reflejada. Las designaciones de personas anteriores a junio se consideran
> **stale** (el titular vigente del base manda) y no se aplican; el foco son los cambios de
> ESTRUCTURA (crear/suprimir/transferir/renombrar áreas de nivel SS/DG/GG/organismo).

## Procesados

| Decreto | Fecha | Tipo | Resultado |
|---|---|---|---|
| 14 | 13/01 | Ratificación estructura Secretaría de Medios | ✅ Ya en base (SECME y sus SS/DG coinciden) |
| 17 | 14/01 | Sec. Comunicación: ratif. + crea DG Activos Digitales | ✅ Ya en base (DGACD bajo SECCO) |
| 19 | 15/01 | Designación (Educación, A. Juárez) | ⏭️ Designación stale (no estructura) |
| 21 | 15/01 | Designación (S. L. Vanoni) | ⏭️ Designación stale |
| 24 | 16/01 | Educación: renuncia + designa V. H. Defina | ⏭️ Designación stale |
| 25 | 16/01 | Justicia/JG: renuncias + designa Domenech, Calvo | ⏭️ Designación stale |
| 26 | 16/01 | Designaciones (Carreira, D'Ángelo) | ⏭️ Designación stale |
| 30 | 16/01 | Renuncia + designa V. I. Torres | ⏭️ Designación stale |
| 35 ⭐ | 26/01 | Estructura Justicia: suprime DG Articulación Laboral Federal; crea DGGAP, DGPCAR, USPRS, etc. | ✅ Ya en base (todas presentes; la suprimida ausente) |
| 39 ⭐ | 30/01 | Cultura/Sec. General: crea SS Patrimonio y Desarrollo Cultural; reubica DGs; **suprime SS Análisis Prospectivo** | ⚠️ **CORREGIDO**: `SSANP` seguía en el base → eliminada. El resto ya estaba bien |
| 58 ⭐ | 11/02 | Desarrollo Humano/JG: suprime Sec. Ejecución Proyectos Especiales y SS Gestión y Desarrollo Urbano; crea Sec. Gestión y Desarrollo Urbano + DGIDEPE; mueve CBAS a JG | ✅ Ya en base |
| 94 | 04/03 | Designaciones de personas (anexo = lista) | ⏭️ Designación stale |
| 105 ⭐ | 12/03 | Estructura Min. Salud (todo en anexo) | ⏳ Pendiente: verificar contra anexo |
| 136 | 01/04 | Designaciones de personas (anexo = lista) | ⏭️ Designación stale |
| 105 ⭐ | 12/03 | Anexo organigrama Min. Salud | ✅ Estructura DG/SS coincide (difs. solo en sub-niveles fuera de alcance). Corrijo nombre: "Desarrollo Personal"→"Profesional" |
| 125 | 27/03 | Anexo Ratificaciones JGM (Ordenamiento Urbano) | ⏭️ Designaciones stale; estructura (SECOU) ya en base |
| 137 ⭐ | 31/03 | Anexo organigrama Secretaría General | ⚠️ **CORREGIDO**: Protocolo y Ceremonial (DGPRYC) y Análisis Prospectivo (DGAPR) colgaban directo de SECGE → movidos bajo SS Relaciones Internacionales (como indica el anexo) |

| 124 ⭐ | abr | Anexo organigrama Min. Espacio Público e Higiene (MEPHUGC) | ✅ Estructura DG coincide (superado por el 144, mismo ministerio) |
| 144 ⭐ | may | Anexo organigrama MEPHUGC (versión más nueva) | ✅ Estructura DG coincide; sin cambios |
| 173 ⭐ | 04/05 | Anexo Min. Hacienda y Finanzas + responsabilidades | ✅ Estructura DG coincide; cambios son responsabilidades |
| 174 ⭐ | 04/05 | Min. Seguridad: mueve DG Alcaidías a SS Investigación y Estadística Criminal | ✅ Ya en base (DGALC→SSIYEC); resto responsabilidades |
| 186 ⭐ | 14/05 | Procuración General + responsabilidades | ✅ Ya en base (DG Inteligencia Artificial presente) |

| 193 | 20/05 | Renuncias + designaciones (Desarrollo Económico) | ⏭️ Stale |
| 215 ⭐ | 05/06 | **Sec. Gobierno y Vínculo Ciudadano**: mueve Cementerios y Competencias Comunales; suprime DG Adjunta Registro Estado Civil; crea DG Gestión de Calidad y Demanda Ciudadana | ⚠️ **CORREGIDO** (4 cambios, ver abajo) |
| 216 | 08/06 | Renuncia + designa Jarvis (OSBA) | ⏭️ Stale (ya en Boletín) |
| 220 ⭐ | jun | Anexo organigrama Min. Educación | ✅ Estructura DG coincide |
| 224 | jun | Anexo renuncias (Sec. Gob. y Vínculo Ciudadano) | ⏭️ Stale |

## Correcciones aplicadas al organigrama
- **Decreto 39**: eliminada `SSANP` (SS. Análisis Prospectivo), suprimida por el decreto pero presente en el base.
- **Decreto 137**: `DGPRYC` y `DGAPR` movidos de SECGE (directo) a `SSRIN` (SS. Relaciones Internacionales).
- **Decreto 105**: `DGDIYDP` renombrada a "DG. Docencia, Investigación y Desarrollo Profesional".
- **Decreto 215**: `DGCEME` (Cementerios) → SS Servicios; `DGCCTA` (Competencias Comunales y Talleres) → SS Gestión Comunal; `DGGCDCI` (Gestión de Calidad y Demanda Ciudadana) mal colgada bajo DGISIS → SS Vinculación Ciudadana; eliminada `DGADJREC` (DG Adjunta Registro Estado Civil).

## Parte 2 — Misiones y funciones (carga de `data/funciones.json`)

Fuente por ministerio: el último decreto de estructura con **Anexo II (Responsabilidades
Primarias, Objetivos y Descripción de Acciones)**, yendo de junio 2026 hacia atrás. Los PDF
de los anexos se guardan en `data/decretos/pdf/`.

### Movilidad e Infraestructura (MMIGC) — Decreto 376/25 (sanc. 26/09/2025)
- Cargadas 25 áreas (MIN/SEC/SS/DG/ORG). Las Gerencias/Subgerencias Operativas quedan fuera de alcance.
- Nivel MIN tomado del perfil institucional oficial (el anexo no trae texto a nivel ministerio).
- `DGGEF` (DG. Gestión Económico-Financiera) y entes `AUSA`/`SBASE`: el decreto solo trae
  "Descripción de Acciones"/"Objetivos" (sin Responsabilidad Primaria) → cargados en esos campos.
- **Correcciones estructurales aplicadas:**
  - **`DGTALMI` movida de MJGGC → MMIGC.** Estaba como hija directa de Jefatura de Gabinete,
    pero el id ("MI" = Ministerio de Infraestructura) y el decreto la ubican bajo este ministerio.
    Jefatura NO tiene DGTAL propia (su función técnico-administrativa-legal la cubre `SSCTAL`→`DGTAS`);
    cada ministerio tiene su propia DGTAL dentro de su subárbol y a MMIGC le faltaba.
  - `DGGEF`: nombre corregido "Económico-Financiero" → "Económico-Financiera" (decreto 376/25).
  - `DGGIDT`: quitado el sufijo sobrante "dependiente" → "DG. Gestión Integral del Tránsito".

## Estado
**Todos los decretos estructurales (⭐ con anexo) procesados** (14 → 224).
Los decretos restantes sin anexo (40,41,45,48,53,57,60,62,63,73–76,82,85–88,98,101,103,106,112,114,116,123,141,146,158,161–168,170,175,176,180–182,194,197,200,205,210–212,226,227,228,236) son **designaciones/renuncias de personas** (titulares), anteriores al base de junio → stale. No tocan estructura.
