# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M
lines,secs=P.build_secs(P.load('data/decretos/pdf/105-26-ANX-1.txt'))
F='Decreto 105/26'
MAP={'1.1':'UAIMS','2':'SSASS','2.6':'DGACSA','3':'SSAH','3.1':'EAIT','3.4':'DGESAME',
 '3.5.1':'UPEFIAA','4':'SSAPAC','5':'SSPSGER','5.1':'FACOEP SE','5.2':'UPETDESRHCE',
 '5.8':'DGSISAN','5.9':'DGCOECSSP','5.11':'DGDIYDP'}
fun=set(json.load(io.open('data/funciones.json',encoding='utf-8')))
new={}
for num,aid in MAP.items():
    e=M.entry_from(lines,secs,num,F); new[aid]=e
    print(num,'->',aid,':',(e.get('responsabilidad') or e.get('objetivos') or e.get('acciones') or '!!VACIO!!')[:80])
new['MSGC']={'responsabilidad':('Diseñar, implementar y conducir las políticas de salud de la Ciudad, garantizando el '
 'derecho a la salud de la población. Entender en la atención hospitalaria, la atención primaria, ambulatoria y '
 'comunitaria, la salud mental y el sistema de emergencias (SAME). Planificar el sistema de salud y su gestión en '
 'red, administrar sus recursos humanos, físicos y financieros, y conducir la docencia, investigación y los '
 'sistemas de información sanitaria.'),
 'fuente':'Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'}
added,updated=M.merge(new); print('NUEVOS:',sorted(added))
