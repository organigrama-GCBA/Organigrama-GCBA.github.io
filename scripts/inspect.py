# -*- coding: utf-8 -*-
import sys,io,json; sys.path.insert(0,'scripts')
import parse_anexo as P

anexo=sys.argv[1]; mid=sys.argv[2]
lines,secs=P.build_secs(P.load('data/decretos/pdf/'+anexo+'.txt'))
print('=== ANEXO',anexo,'(SS/DG/ORG) ===')
for n,name,_ in secs:
    if name and not name[0].isdigit() and len(name)>3 and not any(x in name for x in ('GERENCIA','SUBGERENCIA','OPERATIVA','GO ','SGO')):
        print(' ',n,'|',name[:60])
print()
root=json.load(io.open('data/organigrama.json',encoding='utf-8'))
fun=set(json.load(io.open('data/funciones.json',encoding='utf-8')))
def find(n,t):
    if n['id']==t: return n
    for c in n.get('children',[]) or []:
        r=find(c,t)
        if r: return r
def dump(n,d=0):
    if n.get('tipo') in ('MIN','SEC','SS','DG','GG','VJG','ORG'):
        f='' if n['id'] in fun else ' <FALTA>'
        print('  '*d,n['id'],'['+n['tipo']+']',n.get('nombre','')[:46],f)
    for c in n.get('children',[]) or []: dump(c,d+1)
print('=== SUBARBOL',mid,'===')
dump(find(root,mid))
