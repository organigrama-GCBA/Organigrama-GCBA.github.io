# -*- coding: utf-8 -*-
"""Reconstruye TODAS las misiones y funciones (texto completo) por ministerio,
sobrescribiendo lo truncado de la parte 1. Mapeo automático por nombre."""
import sys,io,json; sys.path.insert(0,'scripts')
import automap as A, merge_funciones as M

P='Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'
def mn(t): return {'responsabilidad':t,'fuente':P}

CFG=[
 # (ministerio, anexo, fuente, manual)
 ('MMIGC','376-25-ANX-1','Decreto 376/25',{
   'MMIGC':mn('Entender en la supervisión, planificación, programación y diseño de los flujos de movilidad, las obras viales y de subterráneos de la Ciudad. Entender en la gestión y fiscalización del transporte y el ordenamiento del tránsito, y en las obras de ingeniería hidráulica, de arquitectura, infraestructura urbana y gubernamental, y el planeamiento urbano.'),
   'AUSA':'AUTOPISTAS URBANAS','SBASE':'SUBTERRANEOS DE BUENOS AIRES'}),
 ('MDECGC','125-25-ANX-1','Decreto 125/25',{
   'MDECGC':mn('Diseñar e implementar políticas para promover el desarrollo económico integral de la Ciudad y potenciar a quienes invierten, producen y generan empleo. Fomentar las actividades productivas, la inversión, las micro, pequeñas y medianas empresas, los emprendedores y las industrias creativas; entender en turismo, ciencia y tecnología e innovación productiva.'),
   'ENTUR':'ENTE DE TURISMO','CESBA':'CONSEJO ECONOMICO Y SOCIAL'}),
 ('MJGC','35-26-ANX-1','Decreto 35/26',{
   'MJGC':mn('Entender en las políticas de justicia, política criminal y asuntos penitenciarios y en la ejecución de la pena. Entender en las relaciones gubernamentales e interjurisdiccionales, en el trabajo y empleo, el acceso a la justicia, la asistencia a la víctima, los derechos humanos y los métodos alternativos de resolución de conflictos.'),
   'AGC':'AGENCIA GUBERNAMENTAL DE CONTROL','RPCYCPJ':'REGISTRO PUBLICO DE COMERCIO',
   'CEAMSE':'COORDINACION ECOLOGICA','CAPM':'ANTIGUO PUERTO MADERO','MC':'MERCADO CENTRAL',
   'ACUMAR':'CUENCA MATANZA'}),
 ('MHFGC','173-26-ANX-1','Decreto 173/26',{
   'MHFGC':mn('Entender en la planificación y administración de la hacienda pública y la política tributaria, presupuestaria, financiera y de crédito público. Entender en la administración de los recursos humanos del sector público, las compras y contrataciones, la gestión de bienes inmuebles del Estado y las relaciones fiscales.'),
   'OSBA':{'responsabilidad':'Ejercer las funciones conferidas por su ley de creación (Ley N° 472), como obra social de los trabajadores del Gobierno de la Ciudad.','fuente':'Decreto 173/26 / Ley 472'},
   'BCOCIUDAD':{'responsabilidad':'Banco oficial de la Ciudad Autónoma de Buenos Aires; entidad autárquica que se rige por su Carta Orgánica.','fuente':'Decreto 173/26'},
   'AGIP':'ADMINISTRACION GUBERNAMENTAL DE INGRESOS','LOTBA':'LOTERIA DE LA CIUDAD'}),
 ('MSGC','105-26-ANX-1','Decreto 105/26',{
   'MSGC':mn('Diseñar, implementar y conducir las políticas de salud de la Ciudad, garantizando el derecho a la salud. Entender en la atención hospitalaria, primaria, ambulatoria y comunitaria, la salud mental, el SAME, la planificación sanitaria y la gestión en red, y la administración de los recursos del sistema de salud.'),
   'EAIT':'INSTITUTO DE TRASPLANTE','FACOEP SE':'FACTURACION Y COBRANZA','UPEFIAA':'FORTALECIMIENTO INSTITUCIONAL','UPETDESRHCE':'TRANSFORMACION DIGITAL EN SALUD'}),
 ('MCGC','134-26-ANX-1','Decreto 134/26',{
   'MCGC':mn('Diseñar e implementar las políticas culturales de la Ciudad: gestión cultural, patrimonio y desarrollo cultural, enseñanza artística, museos, teatros y centros culturales, promoviendo el acceso a la cultura y la preservación del patrimonio histórico y cultural.'),
   'EATC':'TEATRO COLON'}),
 ('MEDGC','220-26-ANX-1','Decreto 220/26',{
   'MEDGC':mn('Diseñar e implementar las políticas educativas de la Ciudad, garantizando el derecho a la educación. Entender en el planeamiento e innovación educativa, la gestión del aprendizaje, la tecnología educativa, la carrera y formación docente y la gestión administrativa del sistema educativo estatal y privado.'),
   'UNICABA':'UNIVERSIDAD DE LA CIUDAD','UEICEE':'EVALUACION INTEGRAL'}),
 ('MDHYHGC','58-26-ANX-1','Decreto 58/26',{
   'MDHYHGC':mn('Diseñar e implementar las políticas de desarrollo humano, hábitat e inclusión social: familia y comunidad, personas mayores, red de atención e inclusión social, desarrollo del potencial humano y abordaje territorial e integración de los barrios populares.'),
   'IVC':'INSTITUTO DE VIVIENDA','UEEXAU3':'RENOVACION URBANA'}),
 ('SECGE','137-26-ANX-1','Decreto 137/26',{
   'SECGE':mn('Asistir al Jefe de Gobierno en la coordinación general de la acción de gobierno, las relaciones internacionales e institucionales, la cooperación bilateral y multilateral, el protocolo y ceremonial, los cultos y el análisis prospectivo.')}),
 ('SECLYT','3-25-ANX-1','Decreto 3/25',{
   'SECLYT':mn('Asistir al Jefe de Gobierno en los aspectos legales y técnicos de los actos de gobierno, la escribanía general, la mesa de entradas, salidas y archivo, los asuntos jurídicos, la coordinación y consolidación normativa y el acceso a la información pública.'),
   'OGDAI':'ORGANO GARANTE','OFIP':'INTEGRIDAD PUBLICA'}),
 ('MSEGC','174-26-ANX-1','Decreto 174/26',{
   'MSEGC':mn('Diseñar e implementar las políticas de seguridad pública de la Ciudad. Entender en la prevención del delito, la seguridad en eventos masivos y deportivos, las emergencias y la protección civil, la conducción de la Policía de la Ciudad y de los Bomberos, y las relaciones con la comunidad en materia de seguridad.'),
   'ISSP':{'responsabilidad':'Ejercer las funciones conferidas por la Ley N° 5.688 (Sistema Integral de Seguridad Pública), como instituto de formación y capacitación en seguridad pública.','fuente':'Decreto 174/26 / Ley 5.688'},
   'CSFCABA':{'responsabilidad':'Ejercer las funciones conferidas por la Ley N° 5.847 (Comité de Seguridad en el Fútbol de la CABA).','fuente':'Decreto 174/26 / Ley 5.847'}}),
 ('PG','186-26-ANX-1','Decreto 186/26',{
   'PG':mn('Ejercer la representación y defensa judicial y extrajudicial de la Ciudad Autónoma de Buenos Aires, dictaminar sobre la legalidad de los actos de gobierno y asesorar jurídicamente al Poder Ejecutivo, conforme la Ley N° 1.218.'),
   'DGAJG':'ADJUNTA ASUNTOS JUDICIALES'}),
 ('SECGVC','215-26-ANX-1','Decreto 215/26',{
   'SECGVC':mn('Diseñar e implementar las políticas de gobierno y vínculo ciudadano: relación con las comunas, gestión comunal, atención ciudadana y servicios desconcentrados, vinculación ciudadana, participación, y los servicios urbanos territoriales.'),
   'ERSP':{'responsabilidad':'Ejercer las funciones conferidas por la Ley N° 210 (Ente Único Regulador de los Servicios Públicos de la Ciudad).','fuente':'Decreto 215/26 / Ley 210'},
   'COSI':{'responsabilidad':'Ejercer las funciones conferidas por la Ley N° 1.777 (Consejo de Coordinación Intercomunal).','fuente':'Decreto 215/26 / Ley 1.777'}}),
 ('MEPHUGC','124-26-ANX-1','Decreto 124/26',{
   'MEPHUGC':mn('Diseñar e implementar las políticas de espacio público e higiene urbana de la Ciudad: mantenimiento urbano, alumbrado, paisaje urbano, regeneración urbana, sistema pluvial, higiene urbana, recolección, reciclado y limpieza.')}),
 ('SECCO','298-25-COMU-RP','Decreto 298/25',{
   'SECCO':mn('Diseñar y conducir la estrategia de comunicación del Gobierno de la Ciudad: discurso y planificación comunicacional, contenidos, comunicación digital, medios y prensa, comunicación social y gestión de eventos.'),
   'SCCIU':'SEÑAL DE CABLE','LS1':'LS1 RADIO'}),
]

if __name__=='__main__':
    only=sys.argv[1] if len(sys.argv)>1 else None
    tot_new=0; allpend={}
    for mid,anexo,fuente,manual in CFG:
        if only and mid!=only: continue
        new=A.run(mid,anexo,fuente,manual=manual,verbose=False)
        # recolectar pendientes
        areas=set(a for a,_,_ in A.build_min(mid))
        pend=sorted(areas-set(new))
        allpend[mid]=pend
        M.merge(new)
        print(f'{mid}: cargadas {len(new)} | pendientes {len(pend)}: {pend}')
        tot_new+=len(new)
    print('TOTAL cargadas en esta corrida:',tot_new)
