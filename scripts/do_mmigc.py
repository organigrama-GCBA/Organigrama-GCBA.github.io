# -*- coding: utf-8 -*-
import sys; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M

lines,secs=P.build_secs(P.load('data/decretos/pdf/376-25-ANX-1.txt'))
F='Decreto 376/25'
MAP={
 '1.1':'UAIMMI','1.2':'AUSA','1.3':'SBASE','1.5':'DGCRIN',
 '2':'SSPUR','2.1':'DGPLUR','2.2':'DGANU','2.3':'DGARQU',
 '3':'SSPO','3.2':'DGO','3.3':'DGPRO',
 '4':'SECTR','4.2':'DGGIDT','4.3':'DGCATRA',
 '5':'SECT','5.1':'SSPMSV','5.1.2':'DGGEF','5.1.3':'DGDPM','5.1.4':'DGSVI','5.1.5':'DGTCP',
 '5.2':'SSGCM','5.2.1':'DGGSM','5.2.2':'DGCMO',
}
new={aid:M.entry_from(lines,secs,num,F) for num,aid in MAP.items()}
# Ministerio (nivel MIN): sin RP en el anexo -> tomada del perfil institucional oficial
new['MMIGC']={
 'responsabilidad':('Entender en la supervisión, planificación, programación y diseño de los flujos de '
  'movilidad, las obras viales y de subterráneos de la Ciudad Autónoma de Buenos Aires. Entender en '
  'las políticas referidas a la gestión y fiscalización del transporte y al ordenamiento del tránsito. '
  'Planificar, implementar y ejecutar las obras de ingeniería hidráulica, de arquitectura, ingeniería, '
  'infraestructura urbana y gubernamental. Entender en la planificación y el planeamiento urbano de la Ciudad.'),
 'fuente':'Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'
}
M.merge(new)
