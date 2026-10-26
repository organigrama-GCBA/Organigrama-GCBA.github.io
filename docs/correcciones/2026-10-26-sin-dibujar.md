# Diez áreas que no se dibujaban en ninguna hoja

Al buscar dónde estaban los dos consejos de memoria de la DG Derechos Humanos aparecieron las dos
cosas: están bien cargados en los datos, y no se dibujaban en ningún lado. Con ellos, diez.

| | padre | |
|---|---|---|
| `CGPMMVTE` | `DGDHU` | Consejo de Gestión del Parque de la Memoria y del Monumento a las Víctimas del Terrorismo de Estado, Ley 3.078 |
| `CAPPM` | `DGDHU` | Consejo asesor en políticas públicas de memoria, Ley 4.929 |
| `UIETFP` | `USPRS` | Instituto de Educación, Trabajo y Formación Profesional, Ley 6.924 |
| `UADMCF` | `DGAI` | Unidad Administrativa de Control de Faltas |
| `UPEFIAA` | `DGSAM` | UPE Fortalecimiento Institucional para el Abordaje de Adicciones |
| `UEE` | `IGEA` | Unidad de Enlace Electoral |
| `SJPCDAD` | `JPCDAD` | Subjefatura Policía de la Ciudad |
| `SJCBCDAD` | `JCBCDAD` | Subjefatura del Cuerpo de Bomberos de la Ciudad |
| `EATC-UAI` | `EATC` | Unidad de Auditoría Interna del Teatro Colón |
| `UAIEHU` | `EHU` | Unidad de auditoría interna del Ente de Higiene Urbana |

## Por qué

La función que acomoda las áreas recorre el árbol por las ramas: una rama es un área que abre
columna propia. Los organismos fuera de nivel se juntan en la calle de abajo a medida que el
recorrido pasa por sus padres.

Un área que no abre columna —porque sus únicas dependencias son fuera de nivel— no es rama: queda
como una caja más de la columna de hojas y el recorrido nunca baja a ella. Sus fuera de nivel no
los recoge nadie. Lo mismo con los que cuelgan de otro fuera de nivel, que tampoco es rama.

Es exactamente el caso de `DGDHU`: sus dos únicas dependencias son los dos consejos, así que no
abre columna, y los dos consejos se perdían.

Ahora, después de recorrer el árbol, se barren todos los fuera de nivel que quedaron sin posición
y se agregan a la calle de abajo bajo la columna de su padre.

## Por qué no se había visto

Porque la cuenta se hacía sobre las **listas** de cada hoja, no sobre las cajas dibujadas. Las diez
áreas estaban en la lista de su hoja —la lista sale del árbol, que está bien— así que el
verificador informaba 515 de 515 mientras diez no aparecían en ningún dibujo.

La comprobación ahora se hace sobre lo dibujado, y está dentro de la propia página: al terminar de
armar las hojas compara las cajas que quedaron en el documento contra las áreas de los datos y deja
las que falten en `self.__sinDibujar`, además de escribirlas en la consola.

Es el tercer verificador de esta tanda que daba cero por mirar la cosa equivocada. Los otros dos
descartaban los pares de líneas exactamente superpuestos por tomarlos como un mismo trazo, que era
justo el defecto que había que encontrar.

## Lo que hizo falta arreglar después

Agregar las diez cajas destapó tres defectos de trazado que antes no se daban:

- El tramo recto entre un área y su dependencia en la misma columna atravesaba por el medio lo que
  hubiera apilado entre las dos. Pasaba del Servicio Penitenciario al Instituto de Educación y
  Trabajo, con dos unidades en el medio. Ahora, si hay algo apilado, el trazo sale de costado por
  la separación que queda justo debajo del área.
- La bajada hasta el pie de la calle tenía el mismo problema: atravesaba lo que el área tuviera
  debajo en su columna. Misma solución.
- El buscador de pasillo, cuando no encontraba ninguno con separación entera, devolvía el ideal
  aunque ya lo usara otro padre: dos trazos exactamente encimados. Ahora elige por puntaje y
  prefiere el que menos tramo comparta con líneas ajenas.

## Lo que queda

Un solo solape, en la hoja de Salud: la punteada de la DG Salud Mental a su UPE comparte 23
unidades con la espina de SS. Atención Primaria antes de separarse y seguir sola otras 478. En esa
calle todos los huecos entre columnas están ocupados en esa franja, así que no hay dónde ponerla
sin compartir algo; 23 unidades es el mínimo disponible.
