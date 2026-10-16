#!/usr/bin/env python3
from pathlib import Path
import html, json, shutil, zipfile

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
DIST = ROOT / 'dist'
WIN = DIST / 'windows'
MOBILE = DIST / 'mobile'
SOURCE = DIST / 'source'

for d in (WIN, MOBILE, SOURCE):
    if d.exists(): shutil.rmtree(d)
    d.mkdir(parents=True, exist_ok=True)

# Self-contained mobile HTML. Remote CC0 audio remains lazy-loaded/cached at runtime.
index = (WEB / 'index.html').read_text(encoding='utf-8')
css = (WEB / 'styles.css').read_text(encoding='utf-8')
js = (WEB / 'app.js').read_text(encoding='utf-8')
index = index.replace('<link rel="manifest" href="manifest.webmanifest" />\n', '')
index = index.replace('<link rel="icon" href="icon.svg" type="image/svg+xml" />\n', '')
index = index.replace('<link rel="stylesheet" href="styles.css" />', f'<style>\n{css}\n</style>')
index = index.replace('<script src="app.js"></script>', f'<script>\n{js}\n</script>')
mobile_html = ROOT / 'StrumLab-Mobile.html'
mobile_html.write_text(index, encoding='utf-8')
shutil.copy2(mobile_html, MOBILE / mobile_html.name)
(MOBILE / 'README.txt').write_text(
    'StrumLab Mobile v2\n\nOpen StrumLab-Mobile.html in a modern mobile browser. '
    'The first use of each guitar note loads a CC0 steel-guitar sample; previously loaded samples '
    'are cached when installed as the PWA. The local synth is the offline fallback.\n', encoding='utf-8')

# Source snapshot
for name in ('main.go','go.mod','README.md','THIRD_PARTY_NOTICES.md','version.json'):
    shutil.copy2(ROOT / name, SOURCE / name)
shutil.copytree(WEB, SOURCE / 'web')
shutil.copytree(ROOT / 'tools', SOURCE / 'tools')
if (ROOT / '.github').exists(): shutil.copytree(ROOT / '.github', SOURCE / '.github')

# Existing EXE, when present, becomes the Windows package.
exe = ROOT / 'StrumLab.exe'
if exe.exists(): shutil.copy2(exe, WIN / 'StrumLab.exe')
(WIN / 'README.txt').write_text(
    'StrumLab for Windows\n\nRun StrumLab.exe. It starts a local server and opens the guitar in your browser.\n'
    'Real guitar samples are CC0 and loaded from Meta Open Sound on first use; the synth fallback is built in.\n', encoding='utf-8')

for folder, outname in ((WIN,'StrumLab-Windows.zip'),(MOBILE,'StrumLab-Mobile.zip'),(SOURCE,'StrumLab-Source.zip')):
    out = DIST / outname
    if out.exists(): out.unlink()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for path in folder.rglob('*'):
            if path.is_file(): z.write(path, path.relative_to(folder))
print('Built:', *(str(p) for p in (mobile_html, DIST/'StrumLab-Windows.zip', DIST/'StrumLab-Mobile.zip', DIST/'StrumLab-Source.zip')), sep='\n- ')
