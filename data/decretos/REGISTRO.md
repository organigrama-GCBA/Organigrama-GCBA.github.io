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

## Correcciones aplicadas al organigrama
- **Decreto 39**: eliminada `SSANP` (SS. Análisis Prospectivo), suprimida por el decreto pero presente en el base.

## Pendientes (estructurales ⭐ con anexo, en orden)
105 (anexo Salud), 124, 125, 137, 144, 173, 174, 186, 193, 215, 216, 220, 224
y los decretos de junio (post-base) para titulares vigentes.
