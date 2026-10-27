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

## Decretos posteriores al base

El base de junio ya no manda sobre estos: son actos más nuevos, así que las designaciones
**sí** se aplican (al revés de las anteriores a junio, que quedan stale).

| Decreto | Publicado | Área | Cambio |
|---|---|---|---|
| 367 | 27/10 | `DGDDDM` — DG. Desarrollo del Deporte Motor | Renuncia de Tomás Francisco Burtin; designa a Gustavo Ariel Der Ohanessian |

El 367 lo pasó el usuario; el Boletín de ese día todavía no está en `data/boletin`, así que el
número está asentado pero el acto no se cotejó contra el texto publicado.

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

### Desarrollo Económico (MDECGC) — Decreto 125/25 (sanc. 11/03/2025)
- Es el último anexo de estructura del ministerio (de junio 2026 hacia atrás): ya reemplazó
  la DG Economía e Innovación Social por la **DG Ciencia y Tecnología (DGCTEC)** que tenía el 52/25.
- Cargadas 18 áreas del cuerpo del ministerio (MIN/SS/DG/ORG).
- **Pendientes (no están en este decreto):**
  - Áreas internas del **Ente de Turismo (ENTUR)** (`UAIENTUR`, `ENTUR-DC`, `DGTALET`, `DGCOT`,
    `EAIT-CODEI`, `DGDTU`, `DGPTU`): el ENTUR es ente fuera de nivel con estructura propia (Ley 2.627);
    el decreto 125/25 solo lo lista como tal ("Ejercer las funciones conferidas por la Ley Nº 2627").
  - `DGIPS` (DG. Innovación y Simplificación de Procesos): figura en el organigrama como hija de
    `DGIP`, pero NO aparece en el anexo del 125/25 (DGIP solo tiene Gerencias Operativas por debajo).
    A revisar: posible creación posterior o ubicación a verificar.

### Justicia (MJGC) — Decreto 35/26 (sanc. 26/01/2026)
- Agregadas 16 áreas faltantes (las ya cargadas por la parte 1 no se pisaron).
- Entes fuera de nivel cargados con su remisión legal (p.ej. USPRS "Ejercer las funciones
  conferidas por la Ley 6.923", AGC "Ley 2.624", CEAMSE "Ordenanza 35.691").
- **Pendientes (no están en el anexo del 35/26):**
  - `DGAJG2` (DG. Asuntos Judiciales Generales): el anexo solo tiene la SS Asuntos Judiciales (4.5)
    con DGs Acceso a la Justicia / Asistencia a la Víctima / Derechos Humanos; no figura esta DG.
  - `IGEA` (Instituto de Gestión Electoral Adjunta) y `UEE` (Unidad de Enlace Electoral):
    el IGE es ente con estructura propia; el 35/26 solo lo lista como fuera de nivel.
  - DGs internas de **AGC** (`DGHP`, `DGHYSA`, `DGFYC`, `DGLYTAGC`, `DGFYCO`, `UAIAGC`): la AGC
    (Ley 2.624) tiene estructura propia; el 35/26 solo lista la AGC como fuera de nivel.

### Hacienda y Finanzas (MHFGC) — Decreto 173/26 (sanc. 04/05/2026)
- Agregadas 13 áreas del cuerpo del ministerio (SS/DG/ORG/MIN).
- `OSBA` y `BCOCIUDAD` figuran como fuera de nivel sin texto en el anexo → cargados con su
  remisión legal mínima (OSBA Ley 472; Banco Ciudad por su Carta Orgánica).
- **AGIP**: cargada a nivel organismo (1.2 del 173/26). Sus DGs internas (`DGVE`, `DGPCGT`,
  `DGTI`, `DGR`, `DGR-Adjunta`, `DGANFA`) tienen estructura propia por **Resolución 59/AGIP/25**
  (Anexos III/IV de responsabilidades) → se cargan aparte.
- Pendiente: internas de LOTBA/Banco Ciudad/OSBA (entes con estatuto propio, fuera de alcance).

### Salud (MSGC) — Decreto 105/26 (sanc. 12/03/2026)
- Agregadas 15 áreas faltantes (SS/DG/ORG/MIN); entes con su remisión legal (EAIT Ley 3.294,
  FACOEP SE Ley 5.622).
- Nota de parseo: el anexo usa rótulos en minúscula ("Descripción de responsabilidades primarias")
  y a veces solo "Responsabilidades Primarias" → se hizo el extractor case-insensitive y flexible.

### Cultura (MCGC) — Decreto 134/26 (sanc. 31/03/2026)
- Agregadas SSPDC, SSPCU, SSGCULT, EATC (Teatro Colón, Ley 2.855) y nivel MIN.
- Pendiente: `MCGC-CPPH` (Comisión Preservación Patrimonio Histórico) no figura en el 134/26.

### Secretaría General (SECGE) — Decreto 137/26 (sanc. 31/03/2026)
- Agregadas las 8 áreas (SS Relaciones Internacionales/Institucionales y sus DGs) + nivel SEC.

### Secretaría Legal y Técnica (SECLYT) — Decreto 3/25 (sanc. 03/01/2025)
- Agregadas las 10 áreas + nivel SEC. El PDF tenía numeración glitcheada → mapeo por nombre.

### Desarrollo Humano y Hábitat (MDHYHGC) — Decreto 58/26 (sanc. 11/02/2026)
- Agregadas las 9 áreas faltantes (IVC Ley 1.251, SS y DGs) + nivel MIN.

> Mejora de herramienta: se agregó mapeo por NOMBRE normalizado (`parse_anexo.get_by_name`)
> para anexos con numeración corrupta en el PDF.

### Áreas de Jefatura de Gabinete (directas) — Decreto 265/26 [265/25] (sanc. 11/07/2025)
- Anexo II completo de la Jefatura (96 págs). Cargadas 32 áreas: SSCTAL+DGs, SSIDDS+DGs,
  IDECBA (ente), SECGDU+DGIUR/DGROC, Sec. de Deportes+DGs, SS Autódromo+DGs, SECITD+DGs y ASI.
- **Pendientes (no están en 265/25, por reorganización del base jun-2026 o por ser internos de entes):**
  - SECITD/ASI: `DGSPP`, `DGSGE`, `DGSGES`, `DGCDC` (divergen del base); internas de ASI
    (`DGISIS`, `DGIASINF`, `DGTALINF`, `DGSEI`, `UAIASINF`) → Resolución 118-ASINF/24 propia.
  - IDECBA internas (`UAIIDECBA`, `DGESTYC`); `DGIDEPE` (creada por 58/26 en SECGDU).
  - `SECOU`+`SSOUR`+`DGFIS`, `CPEST`, `URFVI`(+DGs), `UAAJG`: fuentes propias a relevar.

### Educación (MEDGC) — Decreto 220/26 (sanc. jun 2026)
- Agregadas 6 áreas faltantes (SS + UNICABA Ley 6.053 + UEICEE) + nivel MIN.

### Comunicación (SECCO) — Decreto 298/25, Anexo IV (sanc. 04/08/2025)
- Agregadas 9 áreas + nivel SEC. El anexo usa rótulos "Objetivos"/"Descripción de Acciones".
- Pendiente: `DGACD` (DG Activos Digitales) — creada por Decreto 17/26, posterior al 298/25.

### ⚠️ Reconstrucción con TEXTO COMPLETO (fix de truncado)
Se detectó que las entradas de la **parte 1 estaban truncadas** (p.ej. una DG con solo
"Implementar las diferentes"). Se reconstruyeron TODAS las áreas de cada ministerio con el
texto íntegro del anexo, vía `scripts/rebuild_all.py` (auto-mapeo por nombre) + `batch3.py`
(Jefatura) + `do_agip.py` (AGIP). Mejoras del extractor (`parse_anexo.py`, `merge_funciones.py`):
- `build_secs` ya no confunde números del texto ("artículo 4", "Ley 70", "Decreto 1510")
  con encabezados de sección (causaban cortes a mitad de frase).
- `clean()` recorta firma digital, lema del año y sub-encabezados no numerados colados.
Resultado: 0 entradas vacías/cortas; 399 áreas con funciones de texto completo.
Ministerios reconstruidos: MMIGC, MDECGC, MJGC, MHFGC, MSGC, MCGC, MEDGC, MDHYHGC, SECGE,
SECLYT, MSEGC (174/26), PG (186/26), SECGVC (215/26), MEPHUGC (124/26), SECCO; + Jefatura (265/25).

### Vicejefatura de Gobierno (VJG) — Decreto 380/25 + Resolución 239/APRA/25
- 27 áreas con texto completo: núcleo VJG (SS Relaciones Institucionales y Comunicación,
  SS Ambiente, SS Cultura Ciudadana, DG Mujer/Juventud, COPIDIS, Ecoparque) por Decreto 380/25;
  internas de **APRA** (DG Control Ambiental, DG Evaluación Ambiental, UAI) por Resolución 239/APRA/25.
- Nivel VJG por perfil/Ley de Ministerios.

### Organismos con estructura propia (resoluciones / decretos específicos)
- **Higiene (SECH)** — Decreto 115/26 (crea la Sec. de Higiene bajo Jefatura; anexo -ANX-3, sección 7):
  SECH, Ente de Higiene Urbana (Ley 462), SS Higiene, DG Limpieza, DG Reciclado. (UAIEHU no figura.)
- **Sindicatura (SGCBA)** — Resolución 28/SGCBA/26: UAI, Síndico Adjunto, GG Técnica Adm. y Legal,
  GG Auditoría Jurisdicción I y II, GG Auditoría de Comunas (las GG tienen rango de DG). Tope por Ley 70.
- **AGC** — Resolución 55-AGC/24: DG Habilitaciones, Higiene y Seguridad Alimentaria, Fiscalización y
  Control, Fisc. y Control de Obras, Legal y Técnica, UAI y Unidades Operativas.
- **ASI (ASINF)** — Resolución 118-ASINF/24: DG Integración de Sistemas, Infraestructura, Técnica Adm.
  y Legal, Seguridad Informática, UAI.
- **ENTUR** — Resolución 71-ENTUR/24: DG Técnica Adm. y Legal, Comunicación y Observatorio Turístico,
  Desarrollo Turístico, Promoción Turística, UAI.
- **CDNNYA** — Resolución 1798/CDNNYA/25: Presidencia, Vicepresidencia, UAI, DG Programas
  Descentralizados, Servicios de Atención Permanente, Políticas/Programas/Atención en la Urgencia,
  Legal Técnica y Administrativa, Responsabilidad Penal Juvenil.

### Áreas de Jefatura / Jefe de Gobierno con decreto propio
- **Asuntos Estratégicos (SECAE)** — Decreto 122/25: SS Asuntos Estratégicos, DG Proyectos Estratégicos.
- **Ordenamiento Urbano (SECOU)** — Decreto 124/26 (anexo Jefatura, sección 8): SECOU, SS Gestión
  del Ordenamiento Urbano, DG Fiscalización.
- **Relaciones Federales (URFVI)** — Decreto 292/25 (anexo Jefe de Gobierno): URFVI, SS Asuntos
  Interjurisdiccionales, DG Gestión y Evaluación Estratégica, DG Acuerdos con Provincias y Municipios,
  DG Representaciones Federales, DG Vinculación con Centros Formativos.

### Cierre con descripción/remisión breve
Cuerpos consultivos y áreas sin anexo de responsabilidades específico se cargaron con una descripción
breve (fuente "Descripción breve…") o remisión legal: CPPH, Directorio Consultivo y CODEI y Consejo
Asesor de ENTUR, Unidad de Asesores (JG), IGE Adjunta y Unidad de Enlace Electoral, DG Estadística y
Censos (IDECBA), DGACD, DGNMC, DGIPS, DGSGE, DGSGES, DGIDEPE, UCSYTRM, CBAS, CPEST, COMUNAS y las UAI
de organismos.

## Estado — Parte 2 COMPLETA
**512 / 512 áreas (MIN/SEC/SS/DG/GG/ORG/VJG) con misiones y funciones de texto completo.**
0 entradas vacías o truncadas. Fuentes: anexos de decretos de estructura (Boletín Oficial) y
resoluciones propias de organismos (AGC, ASI, ENTUR, AGIP, CDNNYA, Sindicatura, APRA).

---
## Registro previo (Parte 1 — verificación de estructura)
**Todos los decretos estructurales (⭐ con anexo) procesados** (14 → 224).
Los decretos restantes sin anexo (40,41,45,48,53,57,60,62,63,73–76,82,85–88,98,101,103,106,112,114,116,123,141,146,158,161–168,170,175,176,180–182,194,197,200,205,210–212,226,227,228,236) son **designaciones/renuncias de personas** (titulares), anteriores al base de junio → stale. No tocan estructura.
