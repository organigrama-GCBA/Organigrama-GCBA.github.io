# Se retira el editor visual

El organigrama para descargar lo dibuja `visor.html`, que acomoda las 517 áreas solo a partir del
árbol. Desde que las descargas de la página salen de ahí, el editor D3 —arrastrar cajas, mover
líneas a mano, guardar posiciones— ya no alimentaba nada: era una segunda forma de dibujar lo
mismo, que había que mantener al día a mano cada vez que cambiaba el organigrama.

## Qué se fue

| | |
|---|---|
| `index.html` | de **4.390 a 2.159 líneas**, de 489 KB a 374 KB |
| `data/layout.json` | borrado: 5.613 líneas de posiciones guardadas |

En detalle: el panel del editor y su CSS, las 1.911 líneas del script D3, los helpers del A3 que
solo usaba él, y tres bibliotecas que la página cargaba de cdnjs y ya nadie usa —**d3**,
**html2canvas** y **jspdf**, unos 840 KB de descarga que el visitante se ahorra—.

También se fueron los dos usos que quedaban de `layout.json`: la siembra de posiciones en un
dispositivo nuevo y el par guardar/traer de la nube, que ahora mueven solo `organigrama.json`.

## Qué se queda

- La página pública entera: la lista de organismos, el buscador, el panel de detalle, la pestaña
  **Árbol** y las descargas, que ya salían del visor.
- El **modo administración** con su contraseña, porque no era solo la puerta del editor: también
  destapa el importador, el panel del Boletín y el guardado en la nube. El botón ⚙ ahora activa
  ese modo y avisa, en vez de abrir el editor.
- Las líneas que **borran** las claves viejas de `localStorage`
  (`gcba_org_positions_v1` y compañía). Se dejan a propósito: limpian lo que el editor dejó en el
  navegador de quien lo usó.

## Cómo se verificó

`index.html` carga D3, React y Babel desde cdnjs, que el proxy de la sesión bloquea, así que hasta
ahora esta página nunca se había podido abrir desde acá. Para este cambio se armó un banco de
pruebas: las bibliotecas se bajaron del registro de npm —que sí está permitido— en las mismas
versiones que pide el archivo, y Playwright las sirve desde disco interceptando los pedidos a
cdnjs.

Con eso se corrió la página **antes y después**, en las dos pestañas:

- **cero errores** de consola y de página en ambas;
- el panel de detalle sigue mostrando el titular al hacer clic en un área;
- las capturas de la pestaña Árbol y del panel de detalle son **idénticas píxel a píxel**, antes y
  después, y también después de borrar `layout.json`.

Lo único que cambia en el DOM es que desaparece el `<svg>` vacío del editor.
