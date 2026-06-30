# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M

lines,secs=P.build_secs(P.load('data/decretos/pdf/173-26-ANX-1.txt'))
F='Decreto 173/26'
MAP={
 '1.1':'UAIMHF','1.2':'AGIP','1.3':'LOTBA',
 '2':'SSFIN','3':'SSGEOPE','4':'SSGRH','5':'SSHA','5.2.1':'DGTESADJ','5.3.1':'DGCGADJ','6':'SSABI',
}
fun=set(json.load(io.open('data/funciones.json',encoding='utf-8')))
new={}
for num,aid in MAP.items():
    e=M.entry_from(lines,secs,num,F)
    new[aid]=e
    print(num,'->',aid,':',(e.get('responsabilidad') or e.get('objetivos') or e.get('acciones') or '!!VACIO!!')[:90])
new['MHFGC']={
 'responsabilidad':('Entender en la planificación y administración de la hacienda pública y la política '
  'tributaria, presupuestaria, financiera y de crédito público de la Ciudad. Entender en la administración '
  'de los recursos humanos del sector público, en las compras y contrataciones, en la gestión de los bienes '
  'inmuebles del Estado y en las relaciones fiscales con la Nación y otras jurisdicciones. Ejercer la '
  'supervisión de los organismos de su órbita (AGIP, Lotería, Banco Ciudad, Obra Social).'),
 'fuente':'Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'
}
# Entes sin texto en el anexo (fuera de nivel): remisión legal mínima
new['OSBA']={'responsabilidad':'Ejercer las funciones conferidas por su ley de creación (Ley N° 472), como obra social de los trabajadores del Gobierno de la Ciudad Autónoma de Buenos Aires.','fuente':'Decreto 173/26 / Ley 472'}
new['BCOCIUDAD']={'responsabilidad':'Banco oficial de la Ciudad Autónoma de Buenos Aires; entidad autárquica que se rige por su Carta Orgánica.','fuente':'Decreto 173/26'}
added,updated=M.merge(new)
print('NUEVOS:',sorted(added))
