# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M

PERFIL='Ley de Ministerios / buenosaires.gob.ar (perfil institucional)'

def run(anexo,fuente,by_num=None,by_name=None,extra=None):
    lines,secs=P.build_secs(P.load('data/decretos/pdf/'+anexo+'.txt'))
    new={}
    for aid,num in (by_num or {}).items():
        new[aid]=M.entry_from(lines,secs,num,fuente)
    for aid,sub in (by_name or {}).items():
        _,e=M.entry_by_name(lines,secs,sub,fuente); new[aid]=e
    if extra: new.update(extra)
    # report vacíos
    for aid,e in new.items():
        if not (e.get('responsabilidad') or e.get('objetivos') or e.get('acciones')):
            print('  !!VACIO',aid)
    M.merge(new)
    return new

# ---------- CULTURA (134/26) ----------
run('134-26-ANX-1','Decreto 134/26',
 by_num={'SSPDC':'3','SSPCU':'4','SSGCULT':'2','EATC':'1.2'},
 extra={'MCGC':{'responsabilidad':('Diseñar e implementar las políticas culturales de la Ciudad: gestión '
   'cultural, patrimonio y desarrollo cultural, enseñanza artística, museos, teatros y centros culturales, '
   'promoviendo el acceso a la cultura y la preservación del patrimonio histórico y cultural.'),'fuente':PERFIL}})

# ---------- SECRETARÍA GENERAL (137/26) ----------
run('137-26-ANX-1','Decreto 137/26',
 by_num={'SSRINS':'3','DGCU':'3.2','DGREIN':'3.1','SSRIN':'2','DGCM':'2.4','DGCBI':'2.3','DGPRYC':'1.3','DGAPR':'1.4'},
 extra={'SECGE':{'responsabilidad':('Asistir al Jefe de Gobierno en la coordinación general de la acción de '
   'gobierno, las relaciones internacionales e institucionales, la cooperación bilateral y multilateral, el '
   'protocolo y ceremonial, los cultos y el análisis prospectivo.'),'fuente':PERFIL}})

# ---------- SECRETARÍA LEGAL Y TÉCNICA (3/25) — números glitcheados: por nombre ----------
run('3-25-ANX-1','Decreto 3/25',
 by_name={'UAILYT':'AUDITORIA INTERNA','OGDAI':'ORGANO GARANTE','OFIP':'INTEGRIDAD PUBLICA',
   'DGEGRAL':'ESCRIBANIA GENERAL','DGTEA':'TECNICA Y ADMINISTRATIVA','MGEYA':'MESA DE ENTRADAS',
   'SSAJU':'SUBSECRETARIA DE ASUNTOS JURIDICOS','DGCLE':'COORDINACION LEGAL',
   'DGCCN':'COORDINACION Y CONSOLIDACION NORMATIVA','DGAIGA':'ACCESO A LA INFORMACION Y GOBIERNO ABIERTO'},
 extra={'SECLYT':{'responsabilidad':('Asistir al Jefe de Gobierno en los aspectos legales y técnicos de los '
   'actos de gobierno, la escribanía general, la mesa de entradas, salidas y archivo, los asuntos jurídicos, '
   'la coordinación y consolidación normativa y el acceso a la información pública y gobierno abierto.'),'fuente':PERFIL}})

# ---------- DESARROLLO HUMANO Y HÁBITAT (58/26) ----------
run('58-26-ANX-1','Decreto 58/26',
 by_num={'IVC':'1.2','SSPMA':'6','DGPCPM':'6.3','SSDPH':'2','SSATO':'5','UEEXAU3':'5.1',
   'DGATBPCM':'5.2','SSRAIS':'4','SSFC':'3'},
 extra={'MDHYHGC':{'responsabilidad':('Diseñar e implementar las políticas de desarrollo humano, hábitat e '
   'inclusión social de la Ciudad: familia y comunidad, personas mayores, red de atención e inclusión social, '
   'desarrollo del potencial humano y abordaje territorial e integración de los barrios populares.'),'fuente':PERFIL}})
print('LISTO batch2')
