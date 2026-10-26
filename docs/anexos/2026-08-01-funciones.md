# Misiones y funciones desde los anexos del Decreto 306/2026

Fuente: los 17 anexos de "Responsabilidades Primarias, Objetivos y Descripción de Acciones" del
Decreto 306/26 (`docs/PE-DEC-AJG-AJG-306-26-ANX-{1,3,5,…,33}.pdf`).

Vigencia del decreto: 1° de agosto de 2026.

## Qué cambia

`data/funciones.json` pasa de 512 a 514 entradas:

- **393 entradas actualizadas** con el texto del 306/26.
- **2 altas**: `UJG` (Unidad Jefe de Gobierno) y `DGFORMACIONL` (DG. Formación Laboral para
  Personas con Discapacidad), las dos áreas incorporadas al organigrama durante esta revisión
  que todavía no tenían funciones.
- **395 entradas** citan ahora `Decreto 306/2026` como fuente.

Las áreas que los anexos no cubren —la estructura interna de AGIP, APRA, el Ecoparque, el
Instituto de Trasplante y demás organismos fuera de nivel— conservan su texto y su fuente
anterior.

## Por qué sobrescribir y no completar

El 306/26 aprueba las responsabilidades primarias y objetivos vigentes de las 391 áreas del
Poder Ejecutivo. Antes de aplicarlo se verificó que **ninguna** de las 512 entradas existentes
citara un decreto posterior: las fuentes eran 35/26, 174/26, 173/26, 265/25, 58/26, 215/26,
105/26, 376/25 y otras, todas anteriores. Sobrescribir no pisa nada más nuevo.

El texto nuevo no es idéntico al viejo. Por ejemplo, en `DGCOMUNIC` el 306/26 dice "Diseñar **y
planificar** los lineamientos estratégicos…" e "Implementar **y ejecutar** políticas de
comunicación…", donde el decreto anterior decía "Diseñar" e "Implementar". El largo promedio de
las responsabilidades sube de 1.445 a 1.610 caracteres.

## El error de extracción que lo había impedido

La extracción venía recuperando casi nada —3 de 23 áreas en la primera prueba— por un motivo
simple: el parser buscaba el rótulo `Responsabilidades Primarias`, y el rótulo real de estos
anexos es **`Descripción de Responsabilidades Primarias`**. Nunca coincidía.

Contados sobre los 17 anexos, los rótulos que aparecen son `Descripción de Acciones` (1.051
veces), `Descripción de Responsabilidades Primarias` (357) y `Objetivos` (49).

## Alcance acotado a propósito

Se usó el modo `SOLO_FUNCIONES=1`, que no toca `data/organigrama.json`. La estructura de las 17
jurisdicciones ya se revisó y aplicó una por una contra los diagramas, con decisiones que el
comparador por sí solo no habría tomado —como descartar la Unidad Red de Odontología, que el
texto prefija "FUERA DE NIVEL" pero el diagrama ubica por debajo de Dirección General—. Correr
el importador en modo completo las habría reintroducido.

## Corrección posterior: el pie de página del GEDO

Esta importación dejó basura del pie de página del GEDO dentro del texto de 12 entradas. El
parser filtraba el pie solo cuando ocupaba una línea entera, y con `pdftotext -layout` eso no
alcanza. Se arregló al aplicar el Decreto 355/26 y se limpiaron los datos acto seguido.

El pie se colaba de tres maneras distintas:

1. **El número de expediente a mitad de oración** (8 entradas). Cuando el pie cae a la misma
   altura que el cuerpo, `pdftotext` los junta en una sola línea, a veces sin espacio:
   _"…dar cumplimiento a las Leyes 342, `IF-2026-39728655-GCABA-MSEGC` 6.353 y 5.835…"_

2. **La hoja de firmas entera** (4 entradas). Es la última página del PDF y cae después del
   último título, así que se la quedaba la última área de cada anexo. La DG. General de la Mujer
   terminó "firmada" por el Ministerio de Educación.

3. **Secciones descartadas en silencio** (2 entradas). Cuando el pie se pegaba al rótulo
   —"Descripción de Responsabilidades Primarias `IF-2026-39728655-GCABA-MSEGC`"— la línea pasaba
   de 70 caracteres y el guardia "un rótulo es una línea corta" la descartaba. Sin rótulo, el
   cuerpo entero de esa sección se perdía y el área conservaba su texto anterior. Les pasó a
   `DGPCP` y `DGLF`, que quedaron con el del Decreto 174/26 en vez del 306/26.

Esta tercera forma es la más perversa: no deja rastro en los datos. No se la encuentra buscando
basura, porque lo que produce es una ausencia.

### Cómo se verificó que la limpieza está completa

Correr los 5 anexos afectados alcanza, pero no prueba que no haya más. Así que se corrieron **los
17 anexos dos veces**, con el parser viejo y con el nuevo, partiendo ambos del mismo estado, y se
compararon los dos resultados entre sí. Cualquier ruido de matching aparece igual en los dos y se
cancela; queda solo lo que cambió el arreglo.

El experimento difiere en **13 entradas**, exactamente las 13 que se aplicaron, con el texto
idéntico. Las entradas con basura pasan de 11 a 0.

| | |
|---|---|
| `DGDIYDP`, `DGMCV`, `SSPCU` | hoja de firmas entera (−662, −372, −680 caracteres) |
| `DGPR`, `ISSP`, `SECC`, `SECSEG`, `SSCDI`, `SSCH`, `SSTI`, `UAIMSE` | expediente a mitad de oración (−28/−29 cada una) |
| `DGPCP`, `DGLF` | sección descartada: pasan del 174/26 al 306/26 |

Una entrada más se limpió a mano: el campo `objetivos` de `DGMCV`, que eran 276 caracteres de
hoja de firmas y nada más. El importador no lo pisó porque el anexo no le da objetivos a esa área,
y el importador no borra un campo que la extracción nueva no trae. Es la única de su clase, y no
puede volver a aparecer: el parser ahora corta el texto en la hoja de firmas, antes de parsear.

## Pendiente

- `JG` (la raíz), `CGSERV` y `DGAGA` siguen sin entrada de funciones.
- `DEJENTUR` es una entrada huérfana: su id no existe en el organigrama. Es anterior a este
  cambio y queda para limpiar aparte.
