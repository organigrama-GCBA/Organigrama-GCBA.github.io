# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M, parse_agip as AG

fun=json.load(io.open('data/funciones.json',encoding='utf-8'))
UAI=fun['UAIMMI']['responsabilidad']  # texto estándar de Unidad de Auditoría Interna

new={}
# Desde anexos ya descargados
l1,s1=P.build_secs(P.load('data/decretos/pdf/115-26-HIG.txt'))
for aid,sub in [('DGSPP','SOPORTE DE PROYECTOS PRIORIZADOS'),('DGCDC','CONTACTO DIGITAL CIUDADANO')]:
    _,e=M.entry_by_name(l1,s1,sub,'Decreto 115/26')
    if e.get('responsabilidad') or e.get('objetivos'): new[aid]=e
la,sa=AG.build('data/decretos/pdf/agip-59-25-RP-sup.txt')
_,txt=AG.get_by_name(la,sa,'DIRECCION GENERAL LEGAL Y TECNICA')
if txt: new['DGLTAGIP']={'responsabilidad':M.clean(txt),'fuente':'Resolución 59/AGIP/25'}

# Niveles tope y entes por remisión legal / perfil
new['MJGGC']={'responsabilidad':('Coordinar la acción de gobierno y asistir al Jefe de Gobierno en la '
 'articulación de los ministerios y secretarías. Entender en las políticas de modernización, innovación y '
 'transformación digital, planeamiento estratégico, gestión y desarrollo urbano, deportes, estadística y '
 'censos, e integración y desarrollo del sur de la Ciudad.'),
 'fuente':'Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'}
new['CBAS']={'responsabilidad':'Ejercer las funciones conferidas por la Ley N° 470, como corporación para el desarrollo de la zona sur de la Ciudad Autónoma de Buenos Aires.','fuente':'Ley 470'}
new['CPEST']={'responsabilidad':'Consejo de Planeamiento Estratégico: ejercer las funciones conferidas por la Constitución de la Ciudad y la Ley N° 310, proponiendo periódicamente planes estratégicos consensuados con la sociedad civil.','fuente':'Ley 310'}
new['COMUNAS']={'responsabilidad':'Unidades de gestión política y administrativa descentralizada de la Ciudad, conforme la Ley Orgánica de Comunas (Ley N° 1.777).','fuente':'Ley 1.777'}

# UAIs de organismos (texto estándar de auditoría interna)
for aid in ['EATC-UAI','UAIMJG','UAIIDECBA','UAIEHU']:
    new[aid]={'responsabilidad':UAI,'fuente':'Texto estándar de Unidad de Auditoría Interna (Ley 70)'}

M.merge(new)
print('cargadas:',sorted(new))
