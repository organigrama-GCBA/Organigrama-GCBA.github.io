# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_agip as A, merge_funciones as M
lines,secs=A.build('data/decretos/pdf/agip-59-25-RP-sup.txt')
F='Resolución 59/AGIP/25'
NAME={'DGANFA':'DE ANALISIS FISCAL','DGPCGT':'PLANIFICACION Y COORDINACION DE LA GESTION TRIBUTARIA',
 'DGR':'DIRECCION GENERAL DE RENTAS','DGR-Adjunta':'RENTAS ADJUNTA','DGTI':'TECNOLOGIA E INNOVACION',
 'DGVE':'VINCULACION ESTRATEGICA'}
new={}; pend=[]
for aid,sub in NAME.items():
    nm,txt=A.get_by_name(lines,secs,sub)
    if txt: new[aid]={'responsabilidad':M.clean(txt),'fuente':F}; print(aid,'<=',nm)
    else: pend.append(aid)
# DGPCGT: header partido en el PDF -> extracción directa por regex
import re,io
if 'DGPCGT' in pend:
    t=A.load('data/decretos/pdf/agip-59-25-RP-sup.txt')
    m=re.search(r'PLANIFICACI[ÓO]N Y COORDINACI[ÓO]N DE LA GESTI[ÓO]N.*?VIA',t,re.S)
    if m:
        import parse_anexo as P
        rp,ob=P.parse_block(m.group(0))
        if rp: new['DGPCGT']={'responsabilidad':M.clean(rp),'fuente':F}; pend.remove('DGPCGT')
M.merge(new); print('PEND',pend)
