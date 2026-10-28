# Los dos organigramas viejos que `index.html` llevaba adentro

Además de leer `data/organigrama.json`, la página traía **dos copias del organigrama escritas en
el propio archivo**, las dos congeladas en el pasado. Ninguna se actualizaba cuando cambiaban los
datos, y las dos podían mostrarse como si fueran lo vigente.

| | áreas | peso | para qué servía |
|---|---|---|---|
| `INITIAL` | 303 | 36 KB | respaldo si fallaba la carga de `data/organigrama.json` |
| `org-recovered-data` | 525 | 68 KB | botón de administración para "recuperar" un organigrama |

Hoy los datos tienen **517 áreas**. Al `INITIAL` le faltaban 273 y le sobraban 60 que ya no
existen; al recuperado le faltaban 28 y le sobraban 36.

## El respaldo mentía

`INITIAL` se usaba cuando `data/organigrama.json` no cargaba. En ese caso el visitante no veía un
error: veía un organigrama de 2025 **con el mismo aspecto que el bueno**, sin ninguna señal de que
estuviera mirando algo viejo. Para un organigrama de gobierno eso es peor que no ver nada.

Se eliminó. Ahora, si los datos no cargan, la página lo dice: "Error al cargar los datos — Recargá
la página; si sigue pasando, avisá a la Sindicatura".

## El botón de recuperación era un viaje al pasado

`org-recovered-data` venía de alguna restauración vieja. El botón —visible solo en modo
administración— pisaba el organigrama guardado en el navegador con esas 525 áreas y recargaba.
Apretarlo hoy habría tirado abajo todo lo que se corrigió desde entonces. Se eliminó entero: el
bloque de datos, el botón y su código.

Ese mismo bloque instalaba un `Object.defineProperty` sobre `_gcbaEditorAuth` para enterarse del
login sin preguntar cada rato. Antes de borrarlo se comprobó que no hiciera falta para nada más:
el panel del Boletín y el guardado en la nube no dependían de él, cada uno consulta el estado de
login por su cuenta.

## La tercera copia vieja: la del navegador del visitante

`APP_VERSION` llevaba **cuatro meses** en `"20260621"`. Esa constante es la que le dice al
navegador que tire su copia guardada y vuelva a leer `data/organigrama.json`; mientras no cambia,
quien ya visitó la página **sigue viendo lo que tenía guardado**. Todo lo corregido desde junio
—los decretos de septiembre y octubre, los cinco titulares, el EPI, `CAPUAM`— no le llegaba a
nadie que hubiera entrado antes.

Se subió a `"20261028"` el 28/10, con el visto bueno del usuario, porque el efecto no es inocuo:
descarta lo que ese navegador tenga guardado localmente.

Comprobado con el banco de pruebas, sembrando `localStorage` como lo tendría un visitante que ya
entró:

- con la versión **vieja** guardada y un organigrama inventado encima: la copia vieja desaparece,
  aparecen las 517 áreas y la versión guardada queda en `20261028`;
- con la versión **nueva** ya guardada: conserva su copia, que es el comportamiento buscado y
  confirma que el corte lo hace la constante y no otra cosa.

Cero errores en los dos casos. Hay que acordarse de subirla cada vez que cambien los datos.

## Verificación

Con el banco de pruebas que se armó para retirar el editor —las bibliotecas bajadas de npm y
servidas desde disco, porque el proxy de la sesión bloquea cdnjs—:

- **Caso normal**: cero errores, el panel de detalle sigue mostrando el titular, y las capturas de
  la pestaña Árbol y del detalle son **idénticas píxel a píxel** a las de antes del cambio.
- **Caso de datos caídos**, simulando que `data/organigrama.json` devuelve 500: la página carga
  sin errores de JavaScript y muestra el aviso en vez de un organigrama viejo.

`index.html` queda en **1.642 líneas y 267 KB**. Empezó el día en 4.390 líneas y 489 KB.
