# -*- coding: utf-8 -*-
import sys; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M

lines,secs=P.build_secs(P.load('data/decretos/pdf/125-25-ANX-1.txt'))
F='Decreto 125/25'
MAP={
 '1.1':'UAIMDEC','1.3':'CESBA','1.4':'ENTUR','1.6':'DGTALMDEC','1.7':'DGPYCGE',
 '1.8':'DGCTEC','1.9':'DGICAS','1.10':'DGIP','1.11':'DGPEN',
 '2':'SSIN','2.1':'DGPICE','2.2':'DGEPRP','2.3':'DGSN',
 '3':'SSPPR','3.1':'DGMPME','3.2':'DGEMPRE','3.3':'DGDGAS',
}
new={aid:M.entry_from(lines,secs,num,F) for num,aid in MAP.items()}
new['MDECGC']={
 'responsabilidad':('Diseñar e implementar políticas para promover el desarrollo económico integral de la '
  'Ciudad y potenciar a quienes invierten, producen y generan empleo. Fomentar las actividades productivas '
  'en sectores estratégicos, estimular la inversión privada y articular proyectos de asociación '
  'público-privada. Elaborar programas orientados al desarrollo de las micro, pequeñas y medianas empresas, '
  'los emprendedores y las industrias creativas. Entender en las políticas de turismo, ciencia y tecnología '
  'e innovación productiva de la Ciudad Autónoma de Buenos Aires.'),
 'fuente':'Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'
}
added,updated=M.merge(new)
print('nuevos:',sorted(added))
