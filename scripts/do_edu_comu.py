# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M
PERFIL='Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'

def run(anexo,fuente,by_num=None,by_name=None,extra=None):
    lines,secs=P.build_secs(P.load('data/decretos/pdf/'+anexo+'.txt'))
    new={}; pend=[]
    for aid,num in (by_num or {}).items():
        e=M.entry_from(lines,secs,num,fuente)
        (new.__setitem__(aid,e) if (e.get('responsabilidad') or e.get('objetivos') or e.get('acciones')) else pend.append(aid))
    for aid,sub in (by_name or {}).items():
        _,e=M.entry_by_name(lines,secs,sub,fuente)
        (new.__setitem__(aid,e) if (e.get('responsabilidad') or e.get('objetivos') or e.get('acciones')) else pend.append(aid))
    if extra: new.update(extra)
    M.merge(new); print('CARGADOS',len(new),'PEND',pend)

# EDUCACIÓN (220/26)
run('220-26-ANX-1','Decreto 220/26',
 by_num={'SSGAD':'5','UNICABA':'1.3','UEICEE':'1.2','SSTEDU':'4','SSPIE':'2','SSGDA':'3'},
 extra={'MEDGC':{'responsabilidad':('Diseñar e implementar las políticas educativas de la Ciudad, garantizando '
   'el derecho a la educación. Entender en el planeamiento e innovación educativa, la gestión del aprendizaje, '
   'la tecnología educativa, la carrera y formación docente, y la gestión administrativa del sistema educativo '
   'de gestión estatal y privada.'),'fuente':PERFIL}})

# COMUNICACIÓN (298/25 Anexo IV)
run('298-25-COMU-RP','Decreto 298/25',
 by_name={'DGDPC':'DISCURSO Y PLANIFICACION COMUNICACIONAL','DGAGOB':'ACTOS DE GOBIERNO Y AGENDA',
   'SSCDI':'SUBSECRETARIA DE COMUNICACION DIGITAL','DGPLES':'PLANIFICACION ESTRATEGICA','DGAYD':'ANALISIS Y DATOS',
   'DGIOC':'INVESTIGACION Y OPINION CIUDADANA','SSECCP':'ESTRATEGIA DE LA COMUNICACION',
   'DGCONTE':'GENERAL CONTENIDOS','DGACYP':'ARTE, CREATIVIDAD Y PRODUCCION'},
 extra={'SECCO':{'responsabilidad':('Diseñar y conducir la estrategia de comunicación del Gobierno de la Ciudad: '
   'discurso y planificación comunicacional, contenidos, comunicación digital, medios y prensa, comunicación '
   'social y la gestión de eventos, en coordinación con las áreas competentes.'),'fuente':PERFIL}})
