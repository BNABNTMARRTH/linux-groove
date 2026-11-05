#!/usr/bin/env python3
"""Resolve pinned LFS/BLFS book entities; never scrape moving package versions."""
import argparse, hashlib, json, re
from pathlib import Path
ENTITY = re.compile(r'<!ENTITY\s+([\w+.-]+)\s+([\"\'])(.*?)\2\s*>', re.S)
def definitions(text):
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    return {m[0]: m[2] for m in ENTITY.findall(text)}
def expand(value, entities):
    for _ in range(30):
        new = re.sub(r'&([\w+.-]+);', lambda m: entities.get(m[1], m[0]), value)
        if new == value: break
        value = new
    if re.search(r'&[\w+.-]+;', value): raise ValueError(f'unresolved entity: {value}')
    return value

def main():
    ap=argparse.ArgumentParser();ap.add_argument('blfs',type=Path);ap.add_argument('lfs',type=Path);ap.add_argument('recipes',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args()
    common={}
    for p in [a.blfs/'general.ent', a.blfs/'packages.ent', a.blfs/'gnome.ent']:
        common.update(definitions(p.read_text()))
    lfs={**definitions((a.lfs/'general.ent').read_text()), **definitions((a.lfs/'packages.ent').read_text())}
    pages={}
    for p in a.blfs.rglob('*.xml'):
        if 'archive' in p.parts: continue
        text=p.read_text(errors='replace')
        for key in definitions(text):
            if key.endswith('-download-http'): pages[key.removesuffix('-download-http')]=p
    rows=json.loads(a.recipes.read_text())
    for row in rows:
        key=row.get('source',row['name'])
        if row.get('url'): pass
        elif key.startswith('lfs:') or (key not in pages and key+'-url' in lfs):
            key=key.removeprefix('lfs:');row['url']=expand(lfs[key+'-url'],lfs);row['upstream_md5']=lfs[key+'-md5'];row['version']=lfs[key+'-version'];row['book']='LFS 12.2'
        elif key.startswith('xapp:'):
            key=key[5:];local={**common,**definitions((a.blfs/'x/installing/x7app.xml').read_text())}
            row['version']=expand(local[key+'-version'],local);row['upstream_md5']=local[key+'-md5sum'];row['url']=f'https://www.x.org/pub/individual/app/{key}-{row["version"]}.tar.xz';row['book']='BLFS 12.2 x7app'
        elif key.startswith('xlib:'):
            key=key[5:];local={**common,**definitions((a.blfs/'x/installing/x7lib.xml').read_text())}
            row['version']=expand(local[key+'-version'],local);row['upstream_md5']=local[key+'-md5sum'];row['url']=f'https://www.x.org/pub/individual/lib/{key}-{row["version"]}.tar.xz';row['book']='BLFS 12.2 x7lib'
        else:
            page=pages[key];local={**common,**definitions(page.read_text())}
            row['url']=expand(local[key+'-download-http'],local).replace('http://','https://',1)
            row['upstream_md5']=expand(local[key+'-md5sum'],local)
            row['version']=expand(local.get(key+'-version',common.get(key+'-version','book-pinned')),local)
            row['book']='BLFS 12.2 '+str(page.relative_to(a.blfs))
        row['filename']=row['url'].split('/')[-1]
        if row.get('version') == 'book-pinned':
            match=re.search(r'-(\d[^/]*)\.tar\.(?:gz|xz|bz2)$',row['filename'])
            if match:row['version']=match[1]
    a.output.write_text(json.dumps({'blfs_revision':'210c76f9f8a1cda4519a295f62611280cbfc4354','lfs_revision':'4b8c6b4f618ee1138c52633437063ae0d2d97a1c','packages':rows},indent=2)+'\n')
    print(f'Resolved {len(rows)} pinned source packages')
if __name__=='__main__': main()
