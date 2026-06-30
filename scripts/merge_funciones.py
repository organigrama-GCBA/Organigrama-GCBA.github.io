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
    m=re.search(r'Descripci[óo]n de Acciones',blk,re.IGNORECASE)
    if not m: return None
    seg=blk[m.end():]
    return clean(seg)

def _mk(rp,ob,acc_block,fuente):
    rp=clean(rp); ob=clean(ob); e={}
    if rp: e['responsabilidad']=rp
    if ob: e['objetivos']=ob
    if not rp and not ob and acc_block is not None:
        ac=grab_acciones(acc_block)
        if ac: e['acciones']=ac
    e['fuente']=fuente
    return e

def entry_from(lines,secs,num,fuente):
    name,(rp,ob)=P.get(lines,secs,num)
    blk=None
    for k,(n,nm,_) in enumerate(secs):
        if n==num: blk=P.body(lines,secs,k); break
    return _mk(rp,ob,blk,fuente)

def entry_by_name(lines,secs,substr,fuente):
    name,(rp,ob)=P.get_by_name(lines,secs,substr)
    blk=None
    key=P.norm(substr)
    for k,(n,nm,_) in enumerate(secs):
        if nm and key in P.norm(nm): blk=P.body(lines,secs,k); break
    return name,_mk(rp,ob,blk,fuente)

def _part1():
    try: return set(json.load(io.open('scripts/_part1_ids.json',encoding='utf-8')))
    except Exception: return set()

def merge(newentries):
    fun=json.load(io.open('data/funciones.json',encoding='utf-8'))
    p1=_part1()
    added=[]; updated=[]; protected=[]
    for k,v in newentries.items():
        if k in p1:                      # nunca pisar lo cargado por la parte 1
            protected.append(k); continue
        if k in fun: updated.append(k)
        else: added.append(k)
        fun[k]=v
    if protected: print('PROTEGIDAS parte1 (no tocadas):',len(protected),sorted(protected))
    io.open('data/funciones.json','w',encoding='utf-8').write(
        json.dumps(fun,ensure_ascii=False,indent=1))
    print('ADDED',len(added),'UPDATED',len(updated),'TOTAL',len(fun))
    return added,updated
