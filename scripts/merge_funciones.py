# -*- coding: utf-8 -*-
"""Merge nuevas entradas de funciones en data/funciones.json (in place)."""
import io,re,json,sys
import parse_anexo as P

def clean(s):
    if not s: return None
    s=re.sub(r'[ \t]+',' ',s)
    s=re.sub(r'\s*\n\s*',' ',s)
    s=re.sub(r'\s{2,}',' ',s)
    return s.strip()

def grab_acciones(blk):
    m=re.search(r'Descripci[óo]n de Acciones',blk)
    if not m: return None
    seg=blk[m.end():]
    return clean(seg)

def entry_from(lines,secs,num,fuente):
    name,(rp,ob)=P.get(lines,secs,num)
    rp=clean(rp); ob=clean(ob)
    e={}
    if rp: e['responsabilidad']=rp
    if ob: e['objetivos']=ob
    if not rp and not ob:
        # solo hay Descripción de Acciones
        for k,(n,nm,_) in enumerate(secs):
            if n==num:
                ac=grab_acciones(P.body(lines,secs,k))
                if ac: e['acciones']=ac
                break
    e['fuente']=fuente
    return e

def merge(newentries):
    fun=json.load(io.open('data/funciones.json',encoding='utf-8'))
    added=[]; updated=[]
    for k,v in newentries.items():
        if k in fun: updated.append(k)
        else: added.append(k)
        fun[k]=v
    io.open('data/funciones.json','w',encoding='utf-8').write(
        json.dumps(fun,ensure_ascii=False,indent=1))
    print('ADDED',len(added),'UPDATED',len(updated),'TOTAL',len(fun))
    return added,updated
