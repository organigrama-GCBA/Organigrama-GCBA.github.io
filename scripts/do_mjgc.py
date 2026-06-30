# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M

lines,secs=P.build_secs(P.load('data/decretos/pdf/35-26-ANX-1.txt'))
F='Decreto 35/26'
MAP={
 '1.1':'UAIMJ','1.3':'CAPM','1.4':'CEAMSE','1.6':'AGC','1.7':'RPCYCPJ',
 '2':'SSRG','3.1':'SSTYE','4':'SECJ',
 '4.4.1':'UADMCF',
 '4.5.5.1':'CGPMMVTE','4.5.5.2':'CAPPM',
 '4.6.1':'USPRS','4.6.1.1':'UIETFP','4.6.2':'UOTCE','4.6.3':'UDPSPRS',
}
fun=set(json.load(io.open('data/funciones.json',encoding='utf-8')))
new={}
for num,aid in MAP.items():
    if aid in fun:
        print('SKIP ya existe:',aid); continue
    new[aid]=M.entry_from(lines,secs,num,F)
new['MJGC']={
 'responsabilidad':('Entender en el diseño e implementación de las políticas de justicia de la Ciudad, en la '
  'política criminal y los asuntos penitenciarios, y en la ejecución de la pena. Entender en las relaciones '
  'gubernamentales e interjurisdiccionales y en la transferencia de competencias. Entender en las políticas '
  'de trabajo y empleo, en el acceso a la justicia, la asistencia a la víctima y los derechos humanos, y en '
  'los métodos alternativos de resolución de conflictos. Ejercer la supervisión de los organismos de control '
  'y registrales de su órbita.'),
 'fuente':'Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'
}
added,updated=M.merge(new)
print('NUEVOS:',sorted(added))
