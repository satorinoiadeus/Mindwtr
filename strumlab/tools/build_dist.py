#!/usr/bin/env python3
from pathlib import Path
import shutil, zipfile
ROOT=Path(__file__).resolve().parents[1];WEB=ROOT/'web';DIST=ROOT/'dist';WIN=DIST/'windows';MOBILE=DIST/'mobile';SOURCE=DIST/'source'
for d in (WIN,MOBILE,SOURCE):
    if d.exists(): shutil.rmtree(d)
    d.mkdir(parents=True,exist_ok=True)
index=(WEB/'index.html').read_text(encoding='utf-8');css=(WEB/'styles.css').read_text(encoding='utf-8')
order=('chords.js','core.js','audio-samples.js','audio.js','chord-engine.js','guitar-ui.js','app.js')
js='\n'.join((WEB/name).read_text(encoding='utf-8') for name in order)
index=index.replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','').replace('<link rel="stylesheet" href="styles.css">',f'<style>\n{css}\n</style>')
scripts=''.join(f'<script src="{name}"></script>' for name in order)
index=index.replace(scripts,f'<script>\n{js}\n</script>')
mobile=ROOT/'StrumLab-Mobile.html';mobile.write_text(index,encoding='utf-8');shutil.copy2(mobile,MOBILE/mobile.name)
(MOBILE/'README.txt').write_text('StrumLab Mobile v2\n\nOpen StrumLab-Mobile.html in a modern mobile browser. Real CC0 steel-guitar samples load on demand; the synth fallback is built in.\n',encoding='utf-8')
for name in ('main.go','go.mod','README.md','THIRD_PARTY_NOTICES.md','version.json'): shutil.copy2(ROOT/name,SOURCE/name)
shutil.copytree(WEB,SOURCE/'web');shutil.copytree(ROOT/'tools',SOURCE/'tools')
if (ROOT/'.github').exists(): shutil.copytree(ROOT/'.github',SOURCE/'.github')
exe=ROOT/'StrumLab.exe'
if exe.exists(): shutil.copy2(exe,WIN/'StrumLab.exe')
(WIN/'README.txt').write_text('StrumLab for Windows\n\nRun StrumLab.exe. It starts locally and opens the guitar in your browser.\n',encoding='utf-8')
for folder,outname in ((WIN,'StrumLab-Windows.zip'),(MOBILE,'StrumLab-Mobile.zip'),(SOURCE,'StrumLab-Source.zip')):
    out=DIST/outname
    if out.exists(): out.unlink()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for path in folder.rglob('*'):
            if path.is_file(): z.write(path,path.relative_to(folder))
print('Built:',DIST/'StrumLab-Windows.zip',DIST/'StrumLab-Mobile.zip',DIST/'StrumLab-Source.zip',sep='\n- ')
