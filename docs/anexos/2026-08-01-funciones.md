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

## Pendiente

- `JG` (la raíz), `CGSERV` y `DGAGA` siguen sin entrada de funciones.
- `DEJENTUR` es una entrada huérfana: su id no existe en el organigrama. Es anterior a este
  cambio y queda para limpiar aparte.
