# -*- coding: utf-8 -*-
"""Auto-mapea cada área del subárbol de un ministerio contra las secciones de un anexo,
emparejando por NOMBRE (sin los prefijos de tipo). Sobrescribe con texto COMPLETO."""
import sys,io,json,re; sys.path.insert(0,'scripts')
import parse_anexo as P, merge_funciones as M

I=re.I
def core(name):
    s=name or ''
    s=re.sub(r'^\s*(D\.?\s*G\.?|S\.?\s*S\.?|SEC\.?|U\.?A\.?I\.?|UPE)\s*','',s,flags=I)
    s=re.sub(r'^\s*(DIRECCI[ÓO]N\s+GENERAL|DIRECCI[ÓO]N|SUBSECRETAR[ÍI]A|SECRETAR[ÍI]A|'
            r'FUERA\s+DE\s+NIVEL|UNIDAD\s+DE\s+AUDITOR[ÍI]A\s+INTERNA|UNIDAD|INSTITUTO|'
            r'ENTE\s+AUT[ÁA]RQUICO|ENTE|AGENCIA|CONSEJO|COMISI[ÓO]N|ORGANISMO|CORPORACI[ÓO]N)\s*','',s,flags=I)
    s=re.sub(r'^\s*(DE\s+LA\s+|DE\s+LOS\s+|DEL\s+|DE\s+|LA\s+|LOS\s+|EL\s+)','',s,flags=I)
    return P.norm(s)

INSCOPE=('MIN','SEC','SS','DG','GG','VJG','ORG')

STOP={'DE','DEL','LA','LAS','LOS','EL','Y','E','EN','A','AL','CON','PARA','POR','SU',
 'GENERAL','GRAL','DIRECCION','SUBSECRETARIA','SECRETARIA','UNIDAD','FUERA','NIVEL',
 'DG','SS','SEC','UAI','FN','SA','SE','SAU','LEY','N'}
def tokens(name):
    s=name or ''
    raw=re.sub(r'[^A-Za-zÁÉÍÓÚÑáéíóúñ ]',' ',s)
    out=set()
    for w in raw.split():
        w=P.norm(w)
        if w and w not in STOP and not w.isdigit(): out.add(w)
    return out

def build_min(mid):
    root=json.load(io.open('data/organigrama.json',encoding='utf-8'))
    def find(n,t):
        if n['id']==t: return n
        for c in n.get('children',[]) or []:
            r=find(c,t)
            if r: return r
    node=find(root,mid); out=[]
    def w(n):
        if n.get('tipo') in INSCOPE: out.append((n['id'],n.get('tipo'),n.get('nombre','')))
        for c in n.get('children',[]) or []: w(c)
    w(node); return out

def run(mid,anexo,fuente,manual=None,skip=None,verbose=True):
    lines,secs=P.build_secs(P.load('data/decretos/pdf/'+anexo+'.txt'))
    seccore=[(core(nm),k,nm) for k,(n,nm,_) in enumerate(secs) if nm]
    secfull=[(P.norm(nm),k,nm) for k,(n,nm,_) in enumerate(secs) if nm]
    sectok=[(tokens(nm),k,nm) for k,(n,nm,_) in enumerate(secs) if nm]
    areas=build_min(mid)
    new={}; matched=[]; unmatched=[]
    manual=manual or {}; skip=set(skip or [])
    def pick(cand):
        cand.sort(); return cand[0][1]
    for aid,tipo,nombre in areas:
        if aid in skip: continue
        if aid in manual:
            mv=manual[aid]
            if isinstance(mv,str):                      # substring -> extraer por nombre del anexo
                _,e=M.entry_by_name(lines,secs,mv,fuente)
                if e.get('responsabilidad') or e.get('objetivos') or e.get('acciones'):
                    new[aid]=e; matched.append((aid,'[byname] '+mv)); continue
                unmatched.append((aid,nombre+' [manual byname sin texto]')); continue
            new[aid]=mv; matched.append((aid,'[manual]')); continue
        an=P.norm(nombre)
        k=None
        if 'AUDITORIAINTERNA' in an:                                   # UAI por nombre completo
            c=[(len(f),kk,snm) for f,kk,snm in secfull if 'AUDITORIAINTERNA' in f]
            if c: k=pick(c)
        if k is None:
            ac=core(nombre)
            if len(ac)<4: unmatched.append((aid,nombre)); continue
            c=[(len(sc),kk,snm) for sc,kk,snm in seccore if sc==ac]    # 1) core exacto
            if not c:                                                  # 2) conjunto de palabras igual
                at=tokens(nombre)
                if at:
                    c=[(len(st),kk,snm) for st,kk,snm in sectok if st==at]
                    if not c:                                          # 3) subconjunto (área ⊆ sección)
                        c=[(len(st),kk,snm) for st,kk,snm in sectok if at and (at<=st) and len(at)>=2]
            if not c:                                                  # 4) substring de core
                c=[(len(sc),kk,snm) for sc,kk,snm in seccore if len(sc)>=5 and (ac in sc or sc in ac)]
            if not c: unmatched.append((aid,nombre)); continue
            k=pick(c)
        snm=secs[k][1]
        e=M.entry_from(lines,secs,secs[k][0],fuente)
        if not (e.get('responsabilidad') or e.get('objetivos') or e.get('acciones')):
            unmatched.append((aid,nombre+' [match sin texto]')); continue
        new[aid]=e; matched.append((aid,snm))
    if verbose:
        print('--- MATCHED',len(matched))
        for m in matched: print('   ',m)
        print('--- UNMATCHED',len(unmatched))
        for u in unmatched: print('   ',u)
    return new

if __name__=='__main__':
    # modo prueba: python automap.py MID ANEXO "Fuente"
    new=run(sys.argv[1],sys.argv[2],sys.argv[3])
    print('TOTAL a cargar:',len(new))
