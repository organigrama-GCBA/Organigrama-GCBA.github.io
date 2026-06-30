# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_agip as A, merge_funciones as M
lines,secs=A.build('data/decretos/pdf/agc-55-24-ANX-1.txt')
F='Resolución 55-AGC/24'
NAME={'UAIAGC':'UNIDAD DE AUDITORIA INTERNA','DGHP':'HABILITACIONES Y PERMISOS',
 'DGHYSA':'HIGIENE Y SEGURIDAD ALIMENTARIA','DGFYC':'DIRECCION GENERAL FISCALIZACION Y CONTROL',
 'DGFYCO':'FISCALIZACION Y CONTROL DE OBRAS','DGLYTAGC':'DIRECCION GENERAL LEGAL Y TECNICA',
 'UOPCGAGC':'PLANIFICACION DE GESTION Y COORDINACION','UOFIAGC':'OPERATIVA FISCALIZACION INTEGRAL',
 'CAAGC':'UNIDAD COORDINACION ADMINISTRATIVA'}
new={}; pend=[]
for aid,sub in NAME.items():
    nm,txt=A.get_by_name(lines,secs,sub)
    if txt: new[aid]={'responsabilidad':M.clean(txt),'fuente':F}
    else: pend.append(aid)
M.merge(new)
for k in new: print(k,'<=',(new[k]['responsabilidad'])[:70])
print('PEND',pend)
