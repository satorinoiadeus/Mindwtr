extends Node2D
const W=480.0; const H=270.0; const FLOOR=222.0; const GRAV=650.0
var mode="menu"; var mi=0; var si=0; var t=0.0; var rng=RandomNumberGenerator.new(); var pause=false
var names=["fang_yuan","genghis_khan","arcen_markaryan"]; var titles=["FANG YUAN","GENGHIS KHAN","ARCEN MARKARYAN"]; var quotes=["Benefits first.","Steppe diff.","You are not ready."]
var stats=[{"speed":106.0,"light":8.0,"heavy":15.0},{"speed":90.0,"light":9.0,"heavy":17.0},{"speed":120.0,"light":7.0,"heavy":13.0}]
var menu=["ARCADE","VS CPU","CONTROLS","CREDITS","EXIT"]; var frames={}; var portraits={}; var stage:Texture2D; var coffee=[]; var sparks=[]
var pc=0; var cc=1; var p={}; var c={}; var round_over=false; var result_timer=0.0; var msg="OSH COFFEE CLASH"; var msg_t=0.0; var coffee_on=false; var coffee_pos=Vector2.ZERO; var coffee_t=6.0
var touch={"left":false,"right":false,"jump":false,"light":false,"heavy":false,"block":false}; var last={"jump":false,"light":false,"heavy":false}
func _ready(): rng.randomize(); load_assets(); reset_fight(); queue_redraw()
func load_assets():
 var counts={"idle":4,"walk":6,"jump":3,"crouch":2,"light":3,"heavy":4,"block":2,"hurt":2,"victory":2}
 for n in names:
  frames[n]={}; var k=1
  for s in ["idle","walk","jump","crouch","light","heavy","block","hurt","victory"]:
   frames[n][s]=[]
   for i in range(int(counts[s])): frames[n][s].append(load("res://assets/%s/%02d_%s_%d.png"%[n,k,s,i+1])); k+=1
 for n in names: portraits[n]=load("res://assets/portraits/%s_portrait.png"%n); portraits[n+"_win"]=load("res://assets/portraits/%s_win.png"%n)
 stage=load("res://assets/stages/osh_arena.png")
 for i in range(4): coffee.append(load("res://assets/items/coffee_%d.png"%(i+1)))
 sparks=[load("res://assets/fx/hit_spark_1.png"),load("res://assets/fx/hit_spark_2.png")]
func nf(ch,x,f): return {"char":ch,"pos":Vector2(x,FLOOR),"vel":Vector2.ZERO,"hp":100.0,"facing":f,"atk":"","at":0.0,"hit":false,"cd":0.0,"block":false,"hurt":0.0,"buff":0.0,"spark":0.0,"sp":Vector2.ZERO}
func reset_fight(): p=nf(pc,110,1.0); c=nf(cc,370,-1.0); round_over=false; coffee_on=false; coffee_t=5.0
func start_match(ch): pc=ch; cc=(ch+1+rng.randi_range(0,1))%3; if cc==pc: cc=(pc+1)%3; mode="fight"; pause=false; reset_fight(); say("ROUND 1 — FIGHT!",1.6)
func say(s,d): msg=s; msg_t=d
func _physics_process(d):
 t+=d; msg_t=maxf(0,msg_t-d)
 if mode!="fight" or pause: queue_redraw(); return
 if round_over: result_timer-=d; if result_timer<=0: mode="results"; queue_redraw(); return
 update_player(); update_cpu(); update_f(p,d); update_f(c,d); push(); hit(p,c,true); hit(c,p,false); update_coffee(d)
 if p.hp<=0 or c.hp<=0: round_over=true; result_timer=1.8; say((titles[pc] if c.hp<=0 else titles[cc])+" WINS!",1.8)
 queue_redraw()
func update_player():
 var a=Input.get_axis("move_left","move_right"); a+=(-1.0 if touch.left else 0.0)+(1.0 if touch.right else 0.0); a=clampf(a,-1,1); var st=stats[int(p.char)]
 if p.atk=="": p.vel.x=a*float(st.speed)*(1.22 if p.buff>0 else 1.0)
 p.block=(Input.is_action_pressed("block") or touch.block) and p.atk==""
 var jp=Input.is_action_just_pressed("jump") or (touch.jump and not last.jump); var lp=Input.is_action_just_pressed("light_attack") or (touch.light and not last.light); var hp=Input.is_action_just_pressed("heavy_attack") or (touch.heavy and not last.heavy)
 if jp and p.pos.y>=FLOOR-0.5: p.vel.y=-260.0
 if lp: attack(p,"light")
 elif hp: attack(p,"heavy")
 last.jump=touch.jump; last.light=touch.light; last.heavy=touch.heavy; p.facing=1.0 if c.pos.x>=p.pos.x else -1.0
func update_cpu():
 var dx=p.pos.x-c.pos.x; c.facing=1.0 if dx>=0 else -1.0; c.block=false
 if c.atk!="": return
 if p.atk!="" and absf(dx)<58 and rng.randf()<0.06: c.block=true; c.vel.x=0; return
 if absf(dx)>47: c.vel.x=signf(dx)*float(stats[int(c.char)].speed)*0.88
 else: c.vel.x=0; if c.cd<=0 and rng.randf()<0.05: attack(c,"heavy" if rng.randf()<0.34 else "light")
func update_f(f,d):
 f.cd=maxf(0,f.cd-d); f.hurt=maxf(0,f.hurt-d); f.buff=maxf(0,f.buff-d); f.spark=maxf(0,f.spark-d)
 if f.atk!="": f.at-=d; if f.at<=0: f.atk=""; f.hit=false
 f.vel.y+=GRAV*d; f.pos+=f.vel*d
 if f.pos.y>FLOOR: f.pos.y=FLOOR; f.vel.y=0
 f.pos.x=clampf(f.pos.x,28,W-28)
func attack(f,k):
 if f.cd>0 or f.atk!="" or f.block or round_over:return
 f.atk=k; f.hit=false; f.at=0.26 if k=="light" else 0.44; f.cd=0.34 if k=="light" else 0.60; say(titles[int(f.char)]+(": QUICK HANDS" if k=="light" else ": HEAVY MEME"),0.8)
func hit(a,b,is_p):
 if a.atk=="" or a.hit:return
 var full=0.26 if a.atk=="light" else 0.44; var startup=0.10 if a.atk=="light" else 0.17
 if a.at>full-startup:return
 var dx=b.pos.x-a.pos.x; var r=39.0 if a.atk=="light" else 52.0
 if absf(dx)<=r and absf(b.pos.y-a.pos.y)<36 and (signf(dx)==signf(a.facing) or absf(dx)<12):
  a.hit=true; var dmg=float(stats[int(a.char)][a.atk]); if b.block:dmg*=0.25
  b.hp=maxf(0,b.hp-dmg); b.hurt=0.2; b.vel.x=a.facing*(90 if a.atk=="light" else 155); b.spark=0.13; b.sp=b.pos+Vector2(-a.facing*18,-40); say((titles[int(a.char)])+" COMBO!",0.8)
func push():
 var dx=c.pos.x-p.pos.x
 if absf(dx)<30: var o=30-absf(dx); var q=1.0 if dx>=0 else -1.0; p.pos.x-=q*o*0.5; c.pos.x+=q*o*0.5
func update_coffee(d):
 if not coffee_on: coffee_t-=d; if coffee_t<=0: coffee_on=true; coffee_pos=Vector2(rng.randf_range(155,325),FLOOR-7); say("OSH COFFEE SPAWNED",1.2)
 else:
  if p.pos.distance_to(Vector2(coffee_pos.x,FLOOR))<28: drink(p)
  elif c.pos.distance_to(Vector2(coffee_pos.x,FLOOR))<28: drink(c)
func drink(f): f.hp=minf(100,f.hp+20); f.buff=4; coffee_on=false; coffee_t=rng.randf_range(8,13); say(titles[int(f.char)]+" DRINKS OSH COFFEE",1.2)
func state(f):
 if round_over and ((f==p and c.hp<=0) or (f==c and p.hp<=0)):return "victory"
 if f.hurt>0:return "hurt"
 if f.block:return "block"
 if f.atk!="":return f.atk
 if f.pos.y<FLOOR-1:return "jump"
 if absf(f.vel.x)>6:return "walk"
 return "idle"
func tex(f):
 var s=state(f); var a=frames[names[int(f.char)]][s]; var i=int(t*8)%a.size()
 if s in ["light","heavy"]: var full=0.26 if s=="light" else 0.44; i=mini(a.size()-1,int((1-clampf(f.at/full,0,1))*a.size()))
 return a[i]
func _unhandled_input(e):
 if e is InputEventKey and e.pressed and not e.echo:
  if e.keycode==KEY_ESCAPE: if mode=="fight":pause=!pause; elif mode!="menu":mode="menu"; queue_redraw(); return
  if mode=="menu":
   if e.keycode in [KEY_UP,KEY_W]:mi=(mi-1+menu.size())%menu.size()
   elif e.keycode in [KEY_DOWN,KEY_S]:mi=(mi+1)%menu.size()
   elif e.keycode in [KEY_ENTER,KEY_SPACE]: choose_menu()
  elif mode=="select":
   if e.keycode in [KEY_LEFT,KEY_A]:si=(si-1+3)%3
   elif e.keycode in [KEY_RIGHT,KEY_D]:si=(si+1)%3
   elif e.keycode in [KEY_ENTER,KEY_SPACE]:start_match(si)
  elif mode=="results": if e.keycode==KEY_R:start_match(pc); elif e.keycode in [KEY_ENTER,KEY_SPACE]:mode="menu"
 if e is InputEventScreenTouch: touch_screen(e.position,e.pressed)
 queue_redraw()
func choose_menu():
 if mi<2:mode="select"
 elif menu[mi]=="CONTROLS":mode="controls"
 elif menu[mi]=="CREDITS":mode="credits"
 else:get_tree().quit()
func touch_screen(sp,pressed):
 if not pressed: for k in touch:touch[k]=false; return
 var v=get_viewport_rect().size; var q=sp*Vector2(W/v.x,H/v.y)
 if mode=="menu" and q.x<230 and q.y>110:mi=clampi(int((q.y-117)/24),0,menu.size()-1);choose_menu()
 elif mode=="select":si=clampi(int(q.x/160),0,2);start_match(si)
 elif mode=="fight" and q.y>205:
  if q.x<65:touch.left=true
  elif q.x<125:touch.right=true
  elif q.x<190:touch.jump=true
  elif q.x>415:touch.block=true
  elif q.x>350:touch.heavy=true
  elif q.x>285:touch.light=true
func _draw():
 if mode=="menu":draw_menu()
 elif mode=="select":draw_select()
 elif mode=="controls":draw_page("CONTROLS",["A/D MOVE","W JUMP","J LIGHT","K HEAVY","L BLOCK","ESC PAUSE/BACK","ANDROID TOUCH CONTROLS"])
 elif mode=="credits":draw_page("CREDITS",["OSH COFFEE CLASH v2","GODOT 4","100 GENERATED ASSET FILES","NO RIPPED COMMERCIAL SPRITES"])
 elif mode=="fight":draw_fight()
 else:draw_results()
func draw_menu():
 draw_texture_rect(stage,Rect2(0,0,W,H),false,Color(.5,.4,.4,1));draw_rect(Rect2(0,0,W,H),Color(0,0,0,.55));var f=ThemeDB.fallback_font;draw_string(f,Vector2(35,58),"OSH COFFEE",0,-1,28,Color("ffd24d"));draw_string(f,Vector2(35,88),"CLASH",0,-1,34,Color("ff493e"))
 for i in range(menu.size()):var y=130+i*24;if i==mi:draw_rect(Rect2(32,y-15,180,20),Color(.75,.18,.12,.82));draw_string(f,Vector2(42,y),("▶ " if i==mi else "  ")+menu[i],0,-1,13,Color.WHITE)
func draw_select():
 draw_rect(Rect2(0,0,W,H),Color("10111a"));var f=ThemeDB.fallback_font;draw_string(f,Vector2(140,30),"CHARACTER SELECT",0,-1,20,Color("ffd75f"))
 for i in range(3):var x=28+i*154;draw_rect(Rect2(x,54,132,144),Color("181823"));draw_rect(Rect2(x,54,132,144),Color("ffce55") if i==si else Color("555566"),false,3);draw_texture_rect(portraits[names[i]],Rect2(x+6,60,120,100),true);draw_string(f,Vector2(x+5,178),titles[i],1,122,11,Color.WHITE);draw_string(f,Vector2(x+5,194),quotes[i],1,122,8,Color("ffd7a2"))
func draw_page(title,ls):
 draw_rect(Rect2(0,0,W,H),Color("10111a"));var f=ThemeDB.fallback_font;draw_string(f,Vector2(180,38),title,0,-1,20,Color("ffd75f"));for i in range(ls.size()):draw_string(f,Vector2(110,82+i*22),ls[i],0,-1,11,Color.WHITE)
func draw_fight():
 draw_texture_rect(stage,Rect2(0,0,W,H),false);draw_rect(Rect2(0,0,W,54),Color(0,0,0,.8));var f=ThemeDB.fallback_font;draw_rect(Rect2(14,13,188*p.hp/100,12),Color("e23f6f"));draw_rect(Rect2(466-188*c.hp/100,13,188*c.hp/100,12),Color("e1ae43"));draw_string(f,Vector2(14,43),titles[pc],0,-1,10,Color.WHITE);draw_string(f,Vector2(340,43),titles[cc],0,-1,10,Color.WHITE);draw_sprite(p);draw_sprite(c)
 if coffee_on:draw_texture(coffee[int(t*6)%4],coffee_pos-Vector2(16,28))
 if p.spark>0:draw_texture(sparks[0],p.sp-Vector2(24,24))
 if c.spark>0:draw_texture(sparks[1],c.sp-Vector2(24,24))
 if msg_t>0:draw_rect(Rect2(70,55,340,24),Color(0,0,0,.75));draw_string(f,Vector2(78,71),msg,1,324,9,Color.WHITE)
 draw_buttons();if pause:draw_rect(Rect2(120,90,240,90),Color(0,0,0,.9));draw_string(f,Vector2(190,130),"PAUSED",0,-1,24,Color("ffd75f"))
func draw_sprite(x):draw_set_transform(x.pos,0,Vector2(x.facing,1));draw_texture(tex(x),Vector2(-32,-88));draw_set_transform(Vector2.ZERO,0,Vector2.ONE)
func draw_buttons():
 var f=ThemeDB.fallback_font;var bs=[[Rect2(8,228,50,34),"<"],[Rect2(63,228,50,34),">"],[Rect2(118,228,60,34),"JUMP"],[Rect2(293,228,55,34),"J"],[Rect2(353,228,55,34),"K"],[Rect2(413,228,59,34),"BLOCK"]]
 for b in bs:draw_rect(b[0],Color(0,0,0,.65));draw_rect(b[0],Color("e1ae43"),false,1);draw_string(f,Vector2(b[0].position.x,b[0].position.y+21),b[1],1,b[0].size.x,9,Color.WHITE)
func draw_results():
 var w=pc if c.hp<=0 else cc;var f=ThemeDB.fallback_font;draw_rect(Rect2(0,0,W,H),Color("0b0b10"));draw_texture_rect(portraits[names[w]+"_win"],Rect2(0,0,220,270),true);draw_string(f,Vector2(245,75),titles[w],0,-1,18,Color("ffd75f"));draw_string(f,Vector2(245,110),"WINS",0,-1,34,Color("ff493e"));draw_string(f,Vector2(235,150),quotes[w],0,-1,11,Color.WHITE);draw_string(f,Vector2(235,210),"R REMATCH • ENTER MENU",0,-1,10,Color("9ed7ff"))
