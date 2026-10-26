# Titulares cotejados contra una extracción externa (corte 23/10/2026)

Fuente: `Estructura_GCBA_1.json`, una extracción del organigrama oficial aportada fuera del repo,
con corte declarado al 23 de octubre de 2026. Trae 546 tarjetas en 32 páginas (508 siglas
distintas: cada página repite su raíz) con sigla, titular, dependencia y, para la mayoría, el acto
de designación y la URL del Boletín.

**No es fuente primaria y no se pudo verificar desde acá**: el proxy de la sesión bloquea
`boletinoficial.buenosaires.gob.ar` (403). Se la trató como pista, no como autoridad. Por eso este
cambio toca únicamente lo que no admite discusión.

## La estructura ya coincidía

De 508 áreas del archivo y 515 nuestras, **502 emparejan**. Lo que no:

- **2 áreas que no tenemos**: `CAPUAM` (Consejo Asesor del Plan Urbano Ambiental, bajo Jefatura de
  Gabinete) y `EPI` (Ente Público No Estatal Parque de la Innovación, bajo Desarrollo Económico).
  Quedan sin aplicar, a confirmar.
- **13 son la misma área con otra sigla**: `SSFN`/`DFNCVL` donde mantuvimos `SSCCRS`/`DGDM`,
  `SSSAME` donde dejamos `DGESAME`, `DGEVE` por `DGEV`, `COCI` por `COSI`. Nombre y titular
  idénticos.
- **11 áreas nuestras que el archivo no trae**: sub-organismos a los que su extracción no baja —el
  CODEI del Instituto de Trasplante, la UAI del Colón, el Directorio Consultivo del Ente de
  Turismo, la UPE de Salud Mental—.
- La única diferencia de árbol es que el archivo cuelga los ministerios del Jefe de Gobierno y
  nosotros de Jefatura de Gabinete. Es convención nuestra, no un error.

De paso, **confirma el Decreto 355/26 que acabamos de aplicar**: tiene la Subsecretaría de Familia
y Natalidad con sus cinco direcciones generales, y el Ecoparque sin ningún nivel de Dirección
General, que es la baja de `DGAAV`. Cita `PE-DEC-AJG-AJG-355-26-ANX-1.pdf`, página 32,
encabezado 3.5.

## Lo que se aplica (29 titulares)

**25 son la misma persona con el nombre completo o una letra corregida.** No hay cambio de
funcionario; se corrige el dato:

| | |
|---|---|
| `DGAJU` | Janine Weideman → Weidema**nn** |
| `DGARHC` | E**m**anuel → E**mm**anuel Maximiliano Gil |
| `DGCGEST` | Antone**l**a → Antone**ll**a Fiorella Pagano |
| `DGEGE` | Nancy Elizabeth Ro**s**ana → Ro**x**ana Sorfo |
| `DGFIS` | Mario → Mari**ano** Javier Carmona |
| `DGMAMBA` | Victoria Eugenia Noortho**om** → Noortho**orn** |
| `DGPTU` | Lila Araceli Bac**ia**galupo → Bacigalupo |
| `DGPVEE` | Julieta Valeria Vega → Vega**s** Rodríguez |
| `EMUI` | Joel Franco Iacarin**i** |
| `SSGA` | Claudio Alberto Paniche**tt**i → Paniche**ll**i |
| `SSPCU` | Robert Vi**c**ent → Vi**nc**ent Cortina |
| `UAIMJ` | Sandra Karina Ibend**h**al → Ibenda**h**l |

y trece más donde solo faltaba parte del nombre: `VJG` (Clara → María Clara Muzzio), `BCOCIUDAD`,
`DGCGADJ`, `DGGPEIDA`, `DGIOC`, `DGOGPP`, `DGSEI`, `IVC`, `OSBA`, `OTCEPCDAD`, `SJPCDAD`,
`UAIEHU`, `UAIMEPHU`.

**4 son titulares que nos faltaban**, todos con acto citado:

- `DGR` — María Guadalupe Morera. Resolución 70/AGIP/25, ratificación desde el 1/2/2025.
- `DGSAM` — Sergio José Luis Giordano. Decreto 262/26, desde el 5/6/2026.
- `SJCBCDAD` — Roberto Ángel Parente. Decreto 70/25, Anexo II.
- `DGPCGT` — Luciano Almada. Resolución 64/AGIP/25.

`DGSAM` cierra un círculo: **nuestro propio pipeline lo había detectado** el 22/07/2026, lo aplicó
con confianza alta y quedó en la rama `boletin/2026-07-22`, que nunca se mergeó. Es una de las 16
ramas huérfanas del bug que arreglamos en el PR #48. El archivo lo confirma de forma independiente.

## Lo que NO se aplica (10)

**6 cambios de persona.** El archivo cita decretos, pero no se pueden verificar desde acá y
reemplazar un funcionario es irreversible en los hechos:

| área | repo | archivo | acto citado |
|---|---|---|---|
| `CBAS` | Leandro Cesar Cuervo | Karina Andrea Burijson | Decreto 62/2026 |
| `DGANFA` | Manuel Esteban Balestretti | Juan Ignacio Nigrelli | — |
| `DGDSEC` | Analia Flores | Ezequiel Welsk | Decreto 236/2026 |
| `DGGEDOC` | María Florencia Nestasio | Ana Victoria Carrasco Stanich | Decreto 360/2026 |
| `DGISIS` | Jorge Ariel González | Gabriela Andrea Angeletti | Resolución 136/ASI/2026 |
| `LOTBA` | Nahuel Nicolás Conti | Jesús Mariano Acevedo | Decreto 36/26 y 46/26 |

**Y 4 que son trampas, no diferencias:**

- **`DGAGA` — colisión de sigla.** El archivo llama `DGAGA` a la "DG. Actos de Gobierno y Agenda",
  que para nosotros es `DGAGOB` y ya tiene a Sofía Benegas. Nuestro `DGAGA` es otra área
  —"Direcciones Adjunta de Gestión Administrativa"— que el archivo no trae. Cruzar por sigla sin
  mirar el nombre del área habría puesto a Benegas en el área equivocada.
- **`DGAJG` — la misma trampa.** El archivo usa esa sigla para la "DG. Asuntos Judiciales
  Generales"; nosotros para la "PG Adjunta Asuntos Judiciales", y la DG es nuestro `DGAJG2`, que
  ya tiene a Micaela Soledad del Gaudio. No hay cambio de titular.
- **`ISSP` — dato probablemente vencido.** El archivo lo da a Javier Martín López Zavaleta citando
  la Resolución 177/MSEGC/24. Pero nuestra auditoría del 07/09/2026 trae el Decreto 310/2026
  designando a esa misma persona **Fiscal General del Ministerio Público** desde el 22/9. Si eso
  es así, ya no está en el Instituto. Se deja vacío, como estaba.
- **`EAIT` — no es un titular.** El archivo pone el directorio entero en ese campo: "Presidente:
  Carlos Fernando Cichero / Director: Jorge José Vergés / Directora: Ana María Marta Aguiar". El
  nuestro tiene al presidente, que es lo que el campo espera y lo que el A3 sabe dibujar.

## Cómo se acotó el riesgo

Para cada cambio se exigió que **el nombre del área coincidiera** en los dos archivos, no solo la
sigla. Ese filtro es el que atrapó `DGAGA`. Se buscaron además todas las colisiones de sigla del
archivo entero: hay seis pares cuyos nombres no se parecen, y revisados uno por uno solo `DGAGA`
era una colisión real; los otros cinco son la misma área escrita distinto (`SS. Emergencia` /
`SS. Emergencias`, `Sec. de Deporte` / `Secretaría de Deportes`).

Verificado después de aplicar: 515 nodos, **el único campo que cambió en todo el archivo es
`titular`** —ni un nombre de área, ni una dependencia— y el JSON hace round-trip exacto con
`indent=2`.

## Pendiente

- Confirmar los 6 cambios de persona y las 2 altas (`CAPUAM`, `EPI`).
- Resolver `ISSP`: ¿sigue Zavaleta o asumió como Fiscal General?
- `DGIASINF` y `OFIP`: nosotros tenemos titular y el archivo dice "Sin designar". Puede ser un cese
  que no registramos o un hueco de la extracción.
- `DGPRE` se llama "D.G. **Dirección General** Prensa", con el rango escrito dos veces, igual que
  `DGCOMUN` antes del 355/26. El archivo lo escribe "DG. Prensa".
