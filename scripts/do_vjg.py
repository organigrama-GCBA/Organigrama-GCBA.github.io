# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import automap as A, merge_funciones as M

PERFIL='Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'
VJGtext=('Asistir al Jefe de Gobierno y coordinar las políticas de relaciones institucionales y '
 'comunicación, ambiente, cultura ciudadana y responsabilidad social, las políticas de la mujer, '
 'de juventud y de las personas con discapacidad, ejerciendo además las funciones que le delegue '
 'el Jefe de Gobierno y reemplazándolo en caso de ausencia o vacancia.')

# Capa 1: Vicejefatura (Decreto 380/25)
new=A.run('VJG','380-25-VJG','Decreto 380/25',
          manual={'VJG':{'responsabilidad':VJGtext,'fuente':PERFIL},'COPIDIS':'PLENA PARTICIPACION E INCLUSION'},
          verbose=False)
# Capa 2: internas de APRA (Resolución 239/APRA/25) para lo que falte
areas=set(a for a,_,_ in A.build_min('VJG'))
falta=areas-set(new)
apra=A.run('VJG','apra-239-25','Resolución 239/APRA/25',verbose=False)
for aid,e in apra.items():
    if aid in falta: new[aid]=e
M.merge(new)
falta2=sorted(areas-set(new))
print('VJG cargadas:',len(new),'| pendientes:',falta2)
