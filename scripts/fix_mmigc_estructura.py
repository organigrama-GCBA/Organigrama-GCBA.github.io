# -*- coding: utf-8 -*-
import json,io,sys
sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M

root=json.load(io.open('data/organigrama.json',encoding='utf-8'))

def find(n,tid):
    if n['id']==tid: return n
    for c in n.get('children',[]) or []:
        r=find(c,tid)
        if r: return r

def remove(n,tid):
    ch=n.get('children',[]) or []
    for i,c in enumerate(ch):
        if c['id']==tid:
            return ch.pop(i)
        r=remove(c,tid)
        if r is not None: return r
    return None

# 1) Mover DGTALMI de MJGGC a MMIGC
node=remove(root,'DGTALMI')
assert node is not None, 'DGTALMI no encontrado'
print('DGTALMI children:',[c['id'] for c in node.get('children',[]) or []])
mmi=find(root,'MMIGC')
# insertarla al principio (junto a UAIMMI/DGCRIN, áreas de apoyo del ministerio)
mmi.setdefault('children',[]).insert(0,node)

# 2) Arreglo de nombres
dggef=find(root,'DGGEF'); dggef['nombre']='DG. Gestión Económico-Financiera'
dggidt=find(root,'DGGIDT'); dggidt['nombre']='DG. Gestión Integral del Tránsito'

json.dump(root, io.open('data/organigrama.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print('organigrama.json actualizado')

# 3) Funciones de DGTALMI (sección 1.4 del Decreto 376/25)
lines,secs=P.build_secs(P.load('data/decretos/pdf/376-25-ANX-1.txt'))
e=M.entry_from(lines,secs,'1.4','Decreto 376/25')
M.merge({'DGTALMI':e})
print('DGTALMI funcion:',(e.get('responsabilidad') or e.get('acciones') or '')[:160])
