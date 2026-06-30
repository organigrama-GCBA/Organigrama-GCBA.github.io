# -*- coding: utf-8 -*-
import io,re,json,sys

def load(path):
    txt=io.open(path,encoding='utf-8').read()
    txt=re.sub(r'IF-20\d\d-\d+-GCABA-\w+','',txt)
    txt=re.sub(r'P[áa]gina \d+ de \d+','',txt)
    return txt

def build_secs(txt):
    lines=txt.split('\n')
    # Solo numeraciones plausibles de sección: componentes de 1-2 dígitos.
    hdr=re.compile(r'^(\d{1,2}(?:\.\d{1,2}){0,4})\b(.*)$')
    KEY=('Descripción de Responsabilidades','Descripcion de Responsabilidades',
         'Descripción de Acciones','Descripcion de Acciones','Objetivos')
    def is_header(s):
        m=hdr.match(s)
        if not m: return None
        num=m.group(1); rest=m.group(2).strip()
        # standalone (sin punto) debe ser 1-9 (las secciones tope son de un dígito)
        if '.' not in num and int(num)>9: return None
        # si hay texto tras el número, debe ser un NOMBRE (empieza con letra mayúscula),
        # no una continuación ("/97", ", respectivamente", "de los oficios...")
        if rest:
            letters=[c for c in rest if c.isalpha()]
            if not letters or not all(c.isupper() for c in letters): return None
        return (num,rest)
    secs=[]
    for i,l in enumerate(lines):
        s=l.strip()
        hh=is_header(s)
        if not hh: continue
        num,rest=hh
        # Header de número "pelado" (sin nombre en la misma línea): válido solo si la
        # línea siguiente es un nombre de área (MAYÚSCULAS / FUERA DE NIVEL) o una etiqueta.
        # Evita que números sueltos del texto ("artículo 4 Ley...") partan el bloque.
        if not rest:
            nxt=''
            for jj in range(i+1,min(i+4,len(lines))):
                if lines[jj].strip(): nxt=lines[jj].strip(); break
            ok = nxt.isupper() or 'FUERA DE NIVEL' in nxt or any(nxt.startswith(k) for k in KEY)
            if not ok: continue
        name_parts=[rest] if rest else []
        j=i+1
        while j<len(lines):
            t=lines[j].strip()
            if not t:
                j+=1; continue
            if any(t.startswith(k) for k in KEY): break
            if is_header(t): break
            if t.isupper() or 'FUERA DE NIVEL' in t or t.startswith('('):
                name_parts.append(t); j+=1
            else:
                break
        name=' '.join(p for p in name_parts if p).strip()
        secs.append((num,name,i))
    return lines,secs

def body(lines,secs,idx):
    a=secs[idx][2]
    b=secs[idx+1][2] if idx+1<len(secs) else len(lines)
    return '\n'.join(lines[a:b])

RP_LABEL=r'(?:Descripci[óo]n de\s+)?Responsabilidades?\s+Primarias?'
ACC_LABEL=r'Descripci[óo]n de\s+Acciones'
OBJ_LABEL=r'\n\s*Objetivos\s*\n'

def parse_block(blk):
    def grab(label, stops):
        m=re.search(label, blk, re.IGNORECASE)
        if not m: return None
        start=m.end()
        end=len(blk)
        for st in stops:
            mm=re.search(st, blk[start:], re.IGNORECASE)
            if mm: end=min(end,start+mm.start())
        seg=blk[start:end].strip()
        seg=re.sub(r'[ \t]+',' ',seg)
        seg=re.sub(r'\n{2,}','\n',seg).strip()
        return seg or None
    rp=grab(RP_LABEL,[ACC_LABEL,OBJ_LABEL])
    ob=grab(OBJ_LABEL,[ACC_LABEL])
    return rp,ob

def get(lines,secs,num):
    for k,(n,name,_) in enumerate(secs):
        if n==num:
            return name,parse_block(body(lines,secs,k))
    return None,(None,None)

import unicodedata
def norm(s):
    s=unicodedata.normalize('NFD',s or '').encode('ascii','ignore').decode().upper()
    return re.sub(r'[^A-Z0-9]','',s)

def get_by_name(lines,secs,substr):
    """Devuelve (name, (rp,ob)) de la sección cuyo nombre normalizado contiene substr."""
    key=norm(substr)
    cands=[]
    for k,(n,name,_) in enumerate(secs):
        if name and key in norm(name):
            cands.append((len(norm(name)),k,name))
    if not cands: return None,(None,None)
    cands.sort()  # el match más ajustado (nombre más corto) primero
    _,k,name=cands[0]
    return name,parse_block(body(lines,secs,k))

if __name__=='__main__':
    path=sys.argv[1]
    nums=sys.argv[2:]
    lines,secs=build_secs(load(path))
    for num in nums:
        name,(rp,ob)=get(lines,secs,num)
        print('='*50); print(num,'|',name)
        print('--RP--'); print((rp or '')[:700])
        print('--OBJ--'); print((ob or '')[:500])
