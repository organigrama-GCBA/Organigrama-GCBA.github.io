# -*- coding: utf-8 -*-
import io,re,sys; sys.path.insert(0,'scripts')
import parse_anexo as P

def load(path):
    t=io.open(path,encoding='utf-8').read()
    t=re.sub(r'IF-20\d\d-\d+-GCABA-\w+','',t)
    t=re.sub(r'P[áa]gina \d+ de \d+','',t)
    return t

LABELS=('Descripción de Responsabilidades Primarias','Descripción de Acciones','Objetivos')
def is_header(s):
    if len(s)<5 or len(s)>95: return False
    if s.startswith(('Descripci','Objetivos','Anexo','ANEXO')): return False
    letters=[c for c in s if c.isalpha()]
    if not letters: return False
    up=sum(1 for c in letters if c.isupper())
    return up/len(letters)>0.9

def build(path):
    lines=load(path).split('\n')
    secs=[]  # (name, start_line)
    for i,l in enumerate(lines):
        s=l.strip()
        if is_header(s):
            # merge continuation header lines
            name=s; j=i+1
            while j<len(lines) and is_header(lines[j].strip()) and not lines[j].strip().startswith(LABELS):
                name+=' '+lines[j].strip(); j+=1
            secs.append((name,i))
    return lines,secs

def get_by_name(lines,secs,substr):
    key=P.norm(substr)
    cand=[(len(P.norm(nm)),k,nm) for k,(nm,_) in enumerate(secs) if key in P.norm(nm)]
    if not cand: return None,None
    cand.sort(); _,k,nm=cand[0]
    a=secs[k][1]; b=secs[k+1][1] if k+1<len(secs) else len(lines)
    blk='\n'.join(lines[a:b])
    rp,ob=P.parse_block(blk)
    return nm,(rp or ob)

if __name__=='__main__':
    lines,secs=build('data/decretos/pdf/'+sys.argv[1]+'.txt')
    for nm,_ in secs: print('|',nm[:75])
