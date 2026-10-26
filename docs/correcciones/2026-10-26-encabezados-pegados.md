# 83 textos de funciones con el encabezado del punto siguiente pegado

El importador de anexos cerraba el texto de un punto arrastrando el **título del punto
siguiente**. Por ejemplo, el Consejo Económico y Social quedó así:

> Ejercer las facultades conferidas por la Ley 3.317. ~~1.4 FUERA DE NIVEL ENTE DE TURISMO DE LA
> CIUDAD AUTÓNOMA DE BUENOS~~

Apareció al cargar el Ente Parque de la Innovación, que es justo el punto 1.2 del mismo anexo. Al
barrer `data/funciones.json` entero con el patrón —un número de punto seguido de un título en
mayúsculas— resultaron **83 entradas**, no una.

Es la segunda manifestación del mismo defecto. En octubre se limpiaron los pies de página de GEDO
que el importador arrastraba; esto es lo mismo un escalón más arriba, con los encabezados de
sección. El parser tenía dos agujeros y solo se había tapado uno.

## Qué se hizo

Se cortó cada texto donde arranca el encabezado ajeno. **5.604 caracteres** en total, entre 48 y
356 por entrada.

Antes de cortar se comprobó, entrada por entrada, que el corte cayera después de una oración
terminada. En 81 de las 83 el texto que queda termina en punto. Las otras dos se miraron a mano:

- **`SSASS`** era la más contaminada: después del encabezado seguían 356 caracteres con la lista de
  hospitales de la sección siguiente —Gutiérrez, Argerich, Santojanni, Fernández, Ramos Mejía y el
  resto—. Todo eso pertenece al punto 2.1, no a la Subsecretaría. Se fue entero.
- **`SSSEMD`** queda sin punto final: *"Ejercer las misiones y funciones atinentes a la autoridad
  de aplicación de la ley número 5.847"*. No es un corte mal hecho; el anexo lo escribe así, sin
  punto. Se respeta el acto.

Ninguna entrada quedó vacía. Las ocho que quedan con menos de sesenta caracteres son organismos
fuera de nivel cuyo objetivo en el anexo es una sola línea: *"Ejercer las funciones conferidas por
la Ley N"*.

El detalle de lo que se quitó a cada entrada sale de volver a correr la barrida sobre la versión
anterior del archivo.

## Lo que no se arregló

El importador. Esta corrección limpia los datos ya cargados, no la causa: el próximo anexo que se
importe va a volver a pegar encabezados. `scripts/importar-anexo/run.mjs` ya aprendió a descartar
los pies de GEDO; hay que enseñarle también a cortar en el encabezado del punto siguiente.
