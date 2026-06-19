# Importación del organigrama desde PDF

Modelo: claude-opus-4-8 · Páginas: 32 · Nodos resultantes: 519

## A revisar

### Colisiones de sigla (misma sigla, distinto nombre) — 2

- `ASINF` en pg-11.png: "Agencia de Sistemas de Información (ASI)" vs "Agencia de sistemas de Información" → al segundo le puse `ASINF_2` (corregí la sigla a mano).
- `DGAGA` en pg-29.png: "Direcciones Adjunta de Gestión Administrativa" vs "DG. Actos de Gobierno y Agenda" → al segundo le puse `DGAGA_2` (corregí la sigla a mano).

### Huérfanos (sin padre claro, colgados de la raíz) — 3

- `SGADCBA` (Sindicatura General de la Ciudad de Buenos Aires)
- `APRA` (Agencia de Protección Ambiental Ley N° 2.628)
- `ASINF_2` (Agencia de sistemas de Información)

---

> Reconstruido automáticamente desde docs/Organigrama_GCBA_2026.pdf. Revisá jerarquía y siglas contra el PDF antes de mergear.

## Correcciones aplicadas (revisión)

- **Sindicatura**: se unificó `SGADCBA` dentro de `SGCBA` (misma entidad, mismo titular); quedó como "fuera de nivel" con sus 6 áreas.
- **ASINF**: se eliminó el duplicado suelto `ASINF_2` (el real es `ASINF` bajo `SECITD`).
- **APRA** (Agencia de Protección Ambiental): marcada "fuera de nivel" (confirmar de qué ministerio depende).
- **DGAGA** (colisión): "DG. Actos de Gobierno y Agenda" pasó a id `DGAGOB`.

Total de nodos: 517 · sin ids duplicados.
