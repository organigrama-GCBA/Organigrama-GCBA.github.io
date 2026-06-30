# -*- coding: utf-8 -*-
import io,re,json,sys

def load(path):
    txt=io.open(path,encoding='utf-8').read()
    txt=re.sub(r'IF-20\d\d-\d+-GCABA-\w+','',txt)
    txt=re.sub(r'P[áa]gina \d+ de \d+','',txt)
    return txt

def build_secs(txt):
    lines=txt.split('\n')
    hdr=re.compile(r'^(\d+(?:\.\d+)*)\s*(.*)$')
    KEY=('Descripción de Responsabilidades','Descripcion de Responsabilidades',
         'Descripción de Acciones','Descripcion de Acciones','Objetivos')
    secs=[]
    for i,l in enumerate(lines):
        s=l.strip()
        m=hdr.match(s)
        if not m: continue
        num=m.group(1); rest=m.group(2).strip()
        name_parts=[rest] if rest else []
        j=i+1
        while j<len(lines):
            t=lines[j].strip()
            if not t:
                j+=1; continue
            if any(t.startswith(k) for k in KEY): break
            if hdr.match(t): break
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

def parse_block(blk):
    def grab(label, stops):
        m=re.search(label, blk)
        if not m: return None
        start=m.end()
        end=len(blk)
        for st in stops:
            mm=re.search(st, blk[start:])
            if mm: end=min(end,start+mm.start())
        seg=blk[start:end].strip()
        seg=re.sub(r'[ \t]+',' ',seg)
        seg=re.sub(r'\n{2,}','\n',seg).strip()
        return seg or None
    rp=grab(r'Descripci[óo]n de Responsabilidades Primarias',
            [r'Descripci[óo]n de Acciones',r'\nObjetivos'])
    ob=grab(r'\nObjetivos',[r'Descripci[óo]n de Acciones'])
    return rp,ob

def get(lines,secs,num):
    for k,(n,name,_) in enumerate(secs):
        if n==num:
            return name,parse_block(body(lines,secs,k))
    return None,(None,None)

if __name__=='__main__':
    path=sys.argv[1]
    nums=sys.argv[2:]
    lines,secs=build_secs(load(path))
    for num in nums:
        name,(rp,ob)=get(lines,secs,num)
        print('='*50); print(num,'|',name)
        print('--RP--'); print((rp or '')[:700])
        print('--OBJ--'); print((ob or '')[:500])
