from PIL import Image, ImageDraw, ImageOps
from pathlib import Path
import math, base64, io, shutil
root=Path('meme-fighter/project/assets')
if root.exists(): shutil.rmtree(root)
for sub in ['fang_yuan','genghis_khan','arcen_markaryan','portraits','ui','items','fx','stages']:
    (root/sub).mkdir(parents=True, exist_ok=True)
W,H=64,96

def px(d,b,c): d.rectangle(tuple(map(int,b)),fill=c)

def fighter(name,state,v=0):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im); cx,y=32,88
    if name=='fang_yuan': skin=(211,199,184,255); cloth=(92,20,48,255); dark=(28,20,31,255); accent=(184,40,82,255)
    elif name=='genghis_khan': skin=(163,113,73,255); cloth=(74,88,45,255); dark=(78,55,35,255); accent=(170,124,57,255)
    else: skin=(193,144,108,255); cloth=(231,93,15,255); dark=(35,25,31,255); accent=(40,88,185,255)
    bob=0; arm=11; ay=-34; lx1=-8; lx2=3; lh1=18; lh2=18
    if state=='idle': bob=[0,-1,0,1][v%4]
    elif state=='walk':
        ph=[-4,-2,0,2,4,2][v%6]; lx1-=ph; lx2+=ph; bob=abs(ph)//3
    elif state=='jump': bob=-3; lh1=12; lh2=12; ay=-38
    elif state=='crouch': bob=5; lh1=14; lh2=14; ay=-30
    elif state=='light': arm=20+2*v; ay=-32
    elif state=='heavy': arm=25+2*v; ay=-38; bob=-2
    elif state=='block': arm=7; ay=-39; bob=2
    elif state=='hurt': bob=3; ay=-28
    elif state=='victory': ay=-44; arm=12; bob=[-1,0][v%2]
    y+=bob
    px(d,(18,88,46,91),(0,0,0,70))
    px(d,(cx+lx1,y-lh1,cx+lx1+7,y),tuple(max(0,c-20) for c in cloth[:3])+(255,)); px(d,(cx+lx2,y-lh2,cx+lx2+7,y),cloth)
    px(d,(22,y-42,42,y-18),cloth)
    if name=='fang_yuan': px(d,(22,y-34,27,y-20),accent)
    elif name=='genghis_khan': px(d,(22,y-36,42,y-29),accent)
    else: px(d,(22,y-38,42,y-34),dark); px(d,(25,y-28,39,y-24),dark)
    px(d,(25,y-56,39,y-43),skin)
    if name=='fang_yuan': px(d,(22,y-60,42,y-54),dark); px(d,(18,y-55,24,y-27),dark)
    elif name=='genghis_khan': px(d,(21,y-63,43,y-57),dark); px(d,(26,y-68,38,y-62),dark); px(d,(26,y-46,38,y-43),(80,45,28,255))
    else: px(d,(22,y-60,42,y-55),dark); px(d,(23,y-58,41,y-54),(95,95,105,255)); px(d,(30,y-57,34,y-54),(25,25,25,255)); px(d,(26,y-47,38,y-42),(48,32,28,255))
    px(d,(36,y-51,38,y-49),(20,16,16,255)); px(d,(20,y+ay,27,y+ay+6),skin)
    if state in ('light','heavy'):
        px(d,(39,y+ay,39+arm,y+ay+6),skin)
        if state=='heavy':
            col=(225,35,68,230) if name=='fang_yuan' else ((245,201,80,230) if name=='genghis_khan' else (70,160,255,230)); px(d,(39+arm,y+ay-2,44+arm,y+ay+8),col)
    else: px(d,(39,y+ay,39+arm,y+ay+6),skin)
    if state=='hurt': px(d,(14,y-52,18,y-48),(255,70,70,255)); px(d,(46,y-58,50,y-54),(255,70,70,255))
    if state=='victory': px(d,(30,y-70,34,y-66),(255,245,150,255))
    return im

states=[('idle',4),('walk',6),('jump',3),('crouch',2),('light',3),('heavy',4),('block',2),('hurt',2),('victory',2)]
for cname in ['fang_yuan','genghis_khan','arcen_markaryan']:
    n=1
    for st,count in states:
        for i in range(count):
            fighter(cname,st,i).save(root/cname/f'{n:02d}_{st}_{i+1}.png'); n+=1

def portrait(name,win=False):
    im=Image.new('RGB',(320,240),(16,14,20)); d=ImageDraw.Draw(im)
    skin=(211,199,184) if name=='fang_yuan' else (163,113,73); cloth=(70,15,38) if name=='fang_yuan' else (82,88,46); dark=(20,16,22) if name=='fang_yuan' else (75,52,31)
    d.rectangle((90,20,230,220),fill=cloth); d.rectangle((112,44,208,138),fill=skin); d.rectangle((95,20,225,58),fill=dark)
    if name=='genghis_khan': d.rectangle((88,10,232,40),fill=dark); d.rectangle((125,0,195,20),fill=dark); d.rectangle((130,120,190,145),fill=(75,45,30))
    else: d.rectangle((70,40,100,190),fill=dark)
    d.rectangle((176,84,188,92),fill=(20,16,16)); d.rectangle((125,84,137,92),fill=(20,16,16))
    if win: d.rectangle((0,190,320,240),fill=(120,18,40) if name=='fang_yuan' else (110,82,28))
    return im
for n in ['fang_yuan','genghis_khan']:
    portrait(n).save(root/'portraits'/f'{n}_portrait.png'); portrait(n,True).save(root/'portraits'/f'{n}_win.png')
arcen_b64='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'
arc=Image.open(io.BytesIO(base64.b64decode(arcen_b64))).convert('RGB'); arc=ImageOps.fit(arc,(320,240),method=Image.Resampling.LANCZOS)
arc.save(root/'portraits'/'arcen_markaryan_portrait.png',quality=90); win=arc.copy(); ImageDraw.Draw(win).rectangle((0,190,320,240),fill=(180,55,20)); win.save(root/'portraits'/'arcen_markaryan_win.png',quality=90)
for i in range(4):
    im=Image.new('RGBA',(32,32),(0,0,0,0)); d=ImageDraw.Draw(im); d.rectangle((8,10,23,25),fill=(244,234,215,255)); d.rectangle((10,12,21,16),fill=(90,47,27,255)); d.rectangle((23,13,27,22),outline=(244,234,215,255),width=2)
    for s in range(3): x=12+s*4+(i%2); y=7-s-(i%2); d.rectangle((x,y,x+1,y+2),fill=(235,235,225,200))
    im.save(root/'items'/f'coffee_{i+1}.png')
for i,sz in enumerate([24,40],1):
    im=Image.new('RGBA',(48,48),(0,0,0,0)); d=ImageDraw.Draw(im); c=(255,180,35,255) if i==1 else (70,165,255,255); d.ellipse((24-sz//5,24-sz//5,24+sz//5,24+sz//5),fill=c)
    for a in range(0,360,45): r=math.radians(a); d.line((24,24,24+math.cos(r)*sz/2,24+math.sin(r)*sz/2),fill=c,width=2)
    im.save(root/'fx'/f'hit_spark_{i}.png')
for txt,fn,col in [('ROUND 1','round1.png',(255,174,38)),('FIGHT!','fight.png',(255,70,55)),('K.O.','ko.png',(255,214,55))]:
    im=Image.new('RGBA',(240,64),(0,0,0,0)); d=ImageDraw.Draw(im); d.rectangle((3,3,236,60),fill=(14,12,18,220),outline=col,width=4); d.text((82,24),txt,fill=col); im.save(root/'ui'/fn)
st=Image.new('RGB',(480,270),(42,54,89)); d=ImageDraw.Draw(st); d.rectangle((0,110,480,180),fill=(204,156,96)); d.rectangle((0,180,480,270),fill=(124,91,61)); d.ellipse((392,22,438,68),fill=(255,206,91))
for x in range(0,480,32): d.rectangle((x,105-(x*7%28),x+24,110),fill=(39,39,58))
for x in range(12,470,38): d.rectangle((x,126,x+6,180),fill=(145,41,42)); d.rectangle((x-6,126,x+12,132),fill=(225,175,54))
d.rectangle((145,88,335,145),fill=(92,52,38)); d.rectangle((155,96,325,135),fill=(185,126,69)); d.text((210,110),'OSH ARENA',fill=(32,22,18)); st.save(root/'stages'/'osh_arena.png',quality=95)
print('generated',len(list(root.rglob('*.png'))),'PNG assets')
