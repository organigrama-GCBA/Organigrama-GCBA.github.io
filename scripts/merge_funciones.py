# -*- coding: utf-8 -*-
"""Merge nuevas entradas de funciones en data/funciones.json (in place)."""
import io,re,json,sys
import parse_anexo as P

_HDR=re.compile(r'^(DEPARTAMENTO|DIRECCI[ÓO]N|DIVISI[ÓO]N|SECCI[ÓO]N|SUBGERENCIA|GERENCIA|'
                r'SUBDIRECCI[ÓO]N|COORDINACI[ÓO]N|UNIDAD|SUBSECRETAR[ÍI]A|SECRETAR[ÍI]A)\b')
def clean(s):
    if not s: return None
    # 1) cortar firma digital / pie de página / referencias GEDO
    s=re.split(r'(?:Date:\s*\d|Firmado digitalmente|Digitally signed|Comunicaciones Oficiales|'
               r'Hoja Adicional de Firmas|A[ñn]o del \d|GOBIERNO DE LA CIUDAD|IF-20\d\d-\d|'
               r'P[áa]gina \d+ de \d+|ANEXO\b|(?:[A-ZÑÁÉÍÓÚ]\s+){5,}|["“]\s*20\d\d\s*-)', s)[0]
    # 2) cortar al primer sub-header EN MAYÚSCULAS que se haya colado (siguiente área)
    out=[]
    for ln in s.split('\n'):
        t=ln.strip()
        letters=[c for c in t if c.isalpha()]
        allcaps=letters and all(c.isupper() for c in letters) and len(t)>4
        if out and allcaps and _HDR.match(t.upper()):
            break
        out.append(ln)
    s='\n'.join(out)
    # 3) normalizar espacios y saltos
    s=re.sub(r'[ \t]+',' ',s)
    s=re.sub(r'\s*\n\s*',' ',s)
    s=re.sub(r'\s{2,}',' ',s)
    # 4) limpiar colas: marcadores romanos sueltos (AGIP) y restos
    s=re.sub(r'\s+[IVX]{1,4}[A-Z]?\s*$','',s).strip()
    return s or None

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
    added=[]; updated=[]; over_p1=0
    for k,v in newentries.items():
        if k in fun:
            updated.append(k)
            if k in p1: over_p1+=1
        else: added.append(k)
        fun[k]=v
    if over_p1: print('  (reemplazadas',over_p1,'entradas truncadas de la parte 1)')
    io.open('data/funciones.json','w',encoding='utf-8').write(
        json.dumps(fun,ensure_ascii=False,indent=1))
    print('ADDED',len(added),'UPDATED',len(updated),'TOTAL',len(fun))
    return added,updated
