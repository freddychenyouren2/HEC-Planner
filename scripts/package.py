#!/usr/bin/env python3
"""Create an offline single-file copy and a clean source ZIP (Python stdlib only)."""
from pathlib import Path
import zipfile, re, base64
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'deliverables'
OUT.mkdir(exist_ok=True)
html=(ROOT/'index.html').read_text()
for filename in ['2026-2027-Spring-Courses-Catalogue.pdf','2026-2027-Spring-Skill-Seminars-Catalogue.pdf']:
 data_uri='data:application/pdf;base64,'+base64.b64encode((ROOT/'sources'/filename).read_bytes()).decode('ascii')
 html=html.replace('sources/'+filename,data_uri)
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+(ROOT/'styles.css').read_text()+'\n</style>')
for filename in ['sources.js','exports.js','data.js','core.js','app.js']:
 content=(ROOT/filename).read_text()
 # Avoid a literal closing script tag in future catalogue text breaking the document.
 content=re.sub(r'</script',r'<\\/script',content,flags=re.I)
 html=html.replace(f'<script defer src="{filename}"></script>','')
 html=html.replace('</body>',f'<script>\n{content}\n</script>\n</body>')
html=html.replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">','')
(OUT/'HEC-Paris-Spring-2027.html').write_text(html)
archive=OUT/'HEC-Paris-Spring-2027-source.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(ROOT.rglob('*')):
  if p.is_file() and '__pycache__' not in p.parts:
   z.write(p,Path('hec-planner')/p.relative_to(ROOT))
print(f'{archive.name}: {archive.stat().st_size:,} bytes')
print(f'HEC-Paris-Spring-2027.html: {(OUT/"HEC-Paris-Spring-2027.html").stat().st_size:,} bytes')
