extends Node2D

const W: float = 480.0
const H: float = 270.0
const FLOOR: float = 222.0
const GRAV: float = 650.0

var mode: String = "menu"
var menu_index: int = 0
var select_index: int = 0
var anim_time: float = 0.0
var rng := RandomNumberGenerator.new()
var paused: bool = false

var names: Array[String] = ["fang_yuan", "genghis_khan", "arcen_markaryan"]
var titles: Array[String] = ["FANG YUAN", "GENGHIS KHAN", "ARCEN MARKARYAN"]
var quotes: Array[String] = ["Benefits first.", "Steppe diff.", "You are not ready."]
var stats: Array[Dictionary] = [
    {"speed": 106.0, "light": 8.0, "heavy": 15.0},
    {"speed": 90.0, "light": 9.0, "heavy": 17.0},
    {"speed": 120.0, "light": 7.0, "heavy": 13.0},
]
var menu_items: Array[String] = ["ARCADE", "VS CPU", "CONTROLS", "CREDITS", "EXIT"]

var frames: Dictionary = {}
var portraits: Dictionary = {}
var stage: Texture2D
var coffee_frames: Array[Texture2D] = []
var sparks: Array[Texture2D] = []

var player_char: int = 0
var cpu_char: int = 1
var player: Dictionary = {}
var cpu: Dictionary = {}
var round_over: bool = false
var result_timer: float = 0.0
var message: String = "OSH COFFEE CLASH"
var message_timer: float = 0.0
var coffee_active: bool = false
var coffee_pos: Vector2 = Vector2.ZERO
var coffee_spawn_timer: float = 6.0

var touch: Dictionary = {
    "left": false,
    "right": false,
    "jump": false,
    "light": false,
    "heavy": false,
    "block": false,
}
var last_touch: Dictionary = {
    "jump": false,
    "light": false,
    "heavy": false,
}

func _ready() -> void:
    rng.randomize()
    _load_assets()
    _reset_fight()
    print("OSH_BOOT_OK")
    queue_redraw()

func _load_texture(path: String) -> Texture2D:
    var resource := load(path)
    if resource == null:
        push_error("Missing texture: " + path)
        return null
    return resource as Texture2D

func _load_assets() -> void:
    var state_counts: Dictionary = {
        "idle": 4,
        "walk": 6,
        "jump": 3,
        "crouch": 2,
        "light": 3,
        "heavy": 4,
        "block": 2,
        "hurt": 2,
        "victory": 2,
    }
    var state_order: Array[String] = [
        "idle", "walk", "jump", "crouch", "light", "heavy", "block", "hurt", "victory"
    ]

    for char_name in names:
        frames[char_name] = {}
        var file_number: int = 1
        for state_name in state_order:
            var state_frames: Array[Texture2D] = []
            var count: int = int(state_counts[state_name])
            for frame_index in range(count):
                var path := "res://assets/%s/%02d_%s_%d.png" % [
                    char_name,
                    file_number,
                    state_name,
                    frame_index + 1,
                ]
                state_frames.append(_load_texture(path))
                file_number += 1
            frames[char_name][state_name] = state_frames

    for char_name in names:
        portraits[char_name] = _load_texture("res://assets/portraits/%s_portrait.png" % char_name)
        portraits[char_name + "_win"] = _load_texture("res://assets/portraits/%s_win.png" % char_name)

    stage = _load_texture("res://assets/stages/osh_arena.png")

    coffee_frames.clear()
    for i in range(4):
        coffee_frames.append(_load_texture("res://assets/items/coffee_%d.png" % (i + 1)))

    sparks = [
        _load_texture("res://assets/fx/hit_spark_1.png"),
        _load_texture("res://assets/fx/hit_spark_2.png"),
    ]

func _new_fighter(char_index: int, x: float, facing: float) -> Dictionary:
    return {
        "char": char_index,
        "pos": Vector2(x, FLOOR),
        "vel": Vector2.ZERO,
        "hp": 100.0,
        "facing": facing,
        "atk": "",
        "atk_timer": 0.0,
        "hit_done": false,
        "cooldown": 0.0,
        "block": false,
        "hurt": 0.0,
        "buff": 0.0,
        "spark": 0.0,
        "spark_pos": Vector2.ZERO,
    }

func _reset_fight() -> void:
    player = _new_fighter(player_char, 110.0, 1.0)
    cpu = _new_fighter(cpu_char, 370.0, -1.0)
    round_over = false
    result_timer = 0.0
    coffee_active = false
    coffee_spawn_timer = 5.0
    _clear_touch()

func _start_match(char_index: int) -> void:
    player_char = clampi(char_index, 0, names.size() - 1)
    var opponents: Array[int] = []
    for i in range(names.size()):
        if i != player_char:
            opponents.append(i)
    cpu_char = opponents[rng.randi_range(0, opponents.size() - 1)]
    mode = "fight"
    paused = false
    _reset_fight()
    _say("ROUND 1 — FIGHT!", 1.6)

func _say(text: String, duration: float) -> void:
    message = text
    message_timer = duration

func _physics_process(delta: float) -> void:
    anim_time += delta
    message_timer = maxf(0.0, message_timer - delta)

    if mode != "fight":
        queue_redraw()
        return

    if paused:
        queue_redraw()
        return

    if round_over:
        result_timer -= delta
        if result_timer <= 0.0:
            mode = "results"
        queue_redraw()
        return

    _update_player()
    _update_cpu()
    _update_fighter(player, delta)
    _update_fighter(cpu, delta)
    _resolve_push()
    _resolve_hit(player, cpu)
    _resolve_hit(cpu, player)
    _update_coffee(delta)

    if float(player["hp"]) <= 0.0 or float(cpu["hp"]) <= 0.0:
        round_over = true
        result_timer = 1.8
        var winner_index := player_char if float(cpu["hp"]) <= 0.0 else cpu_char
        _say(titles[winner_index] + " WINS!", 1.8)

    queue_redraw()

func _update_player() -> void:
    var axis: float = Input.get_axis("move_left", "move_right")
    if bool(touch["left"]):
        axis -= 1.0
    if bool(touch["right"]):
        axis += 1.0
    axis = clampf(axis, -1.0, 1.0)

    var char_index: int = int(player["char"])
    var speed: float = float(stats[char_index]["speed"])
    if float(player["buff"]) > 0.0:
        speed *= 1.22

    var vel: Vector2 = player["vel"]
    if String(player["atk"]) == "":
        vel.x = axis * speed
    else:
        vel.x *= 0.82
    player["vel"] = vel

    player["block"] = (Input.is_action_pressed("block") or bool(touch["block"])) and String(player["atk"]) == ""

    var jump_pressed: bool = Input.is_action_just_pressed("jump") or (bool(touch["jump"]) and not bool(last_touch["jump"]))
    var light_pressed: bool = Input.is_action_just_pressed("light_attack") or (bool(touch["light"]) and not bool(last_touch["light"]))
    var heavy_pressed: bool = Input.is_action_just_pressed("heavy_attack") or (bool(touch["heavy"]) and not bool(last_touch["heavy"]))

    var pos: Vector2 = player["pos"]
    if jump_pressed and pos.y >= FLOOR - 0.5:
        vel = player["vel"]
        vel.y = -260.0
        player["vel"] = vel
        _say(titles[player_char] + ": AIRBORNE MEME", 0.7)

    if light_pressed:
        _start_attack(player, "light")
    elif heavy_pressed:
        _start_attack(player, "heavy")

    last_touch["jump"] = touch["jump"]
    last_touch["light"] = touch["light"]
    last_touch["heavy"] = touch["heavy"]

    var cpu_pos: Vector2 = cpu["pos"]
    player["facing"] = 1.0 if cpu_pos.x >= pos.x else -1.0

func _update_cpu() -> void:
    var player_pos: Vector2 = player["pos"]
    var cpu_pos: Vector2 = cpu["pos"]
    var dx: float = player_pos.x - cpu_pos.x
    cpu["facing"] = 1.0 if dx >= 0.0 else -1.0
    cpu["block"] = false

    var vel: Vector2 = cpu["vel"]

    if String(cpu["atk"]) != "":
        vel.x *= 0.82
        cpu["vel"] = vel
        return

    if String(player["atk"]) != "" and absf(dx) < 58.0 and rng.randf() < 0.06:
        cpu["block"] = true
        vel.x = 0.0
        cpu["vel"] = vel
        return

    if coffee_active and float(cpu["hp"]) < 62.0 and absf(coffee_pos.x - cpu_pos.x) < 130.0:
        vel.x = signf(coffee_pos.x - cpu_pos.x) * float(stats[int(cpu["char"])]["speed"]) * 0.9
        cpu["vel"] = vel
        return

    if absf(dx) > 47.0:
        vel.x = signf(dx) * float(stats[int(cpu["char"])]["speed"]) * 0.88
        cpu["vel"] = vel
    else:
        vel.x = 0.0
        cpu["vel"] = vel
        if float(cpu["cooldown"]) <= 0.0 and rng.randf() < 0.05:
            if rng.randf() < 0.34:
                _start_attack(cpu, "heavy")
            else:
                _start_attack(cpu, "light")

func _update_fighter(fighter: Dictionary, delta: float) -> void:
    fighter["cooldown"] = maxf(0.0, float(fighter["cooldown"]) - delta)
    fighter["hurt"] = maxf(0.0, float(fighter["hurt"]) - delta)
    fighter["buff"] = maxf(0.0, float(fighter["buff"]) - delta)
    fighter["spark"] = maxf(0.0, float(fighter["spark"]) - delta)

    if String(fighter["atk"]) != "":
        fighter["atk_timer"] = float(fighter["atk_timer"]) - delta
        if float(fighter["atk_timer"]) <= 0.0:
            fighter["atk"] = ""
            fighter["hit_done"] = false

    var vel: Vector2 = fighter["vel"]
    vel.y += GRAV * delta
    var pos: Vector2 = fighter["pos"]
    pos += vel * delta

    if pos.y > FLOOR:
        pos.y = FLOOR
        vel.y = 0.0

    pos.x = clampf(pos.x, 28.0, W - 28.0)
    fighter["pos"] = pos
    fighter["vel"] = vel

func _start_attack(fighter: Dictionary, kind: String) -> void:
    if float(fighter["cooldown"]) > 0.0:
        return
    if String(fighter["atk"]) != "":
        return
    if bool(fighter["block"]):
        return
    if round_over:
        return

    fighter["atk"] = kind
    fighter["hit_done"] = false
    if kind == "light":
        fighter["atk_timer"] = 0.26
        fighter["cooldown"] = 0.34
    else:
        fighter["atk_timer"] = 0.44
        fighter["cooldown"] = 0.60

    var char_index: int = int(fighter["char"])
    var callout := ": QUICK HANDS" if kind == "light" else ": HEAVY MEME"
    _say(titles[char_index] + callout, 0.8)

func _resolve_hit(attacker: Dictionary, defender: Dictionary) -> void:
    var attack_name: String = String(attacker["atk"])
    if attack_name == "" or bool(attacker["hit_done"]):
        return

    var full_duration: float = 0.26 if attack_name == "light" else 0.44
    var startup: float = 0.10 if attack_name == "light" else 0.17
    if float(attacker["atk_timer"]) > full_duration - startup:
        return

    var attacker_pos: Vector2 = attacker["pos"]
    var defender_pos: Vector2 = defender["pos"]
    var dx: float = defender_pos.x - attacker_pos.x
    var attack_range: float = 39.0 if attack_name == "light" else 52.0
    var attacker_facing: float = float(attacker["facing"])
    var is_in_front: bool = signf(dx) == signf(attacker_facing) or absf(dx) < 12.0

    if absf(dx) > attack_range:
        return
    if absf(defender_pos.y - attacker_pos.y) >= 36.0:
        return
    if not is_in_front:
        return

    attacker["hit_done"] = true
    var attacker_char: int = int(attacker["char"])
    var damage: float = float(stats[attacker_char][attack_name])

    if bool(defender["block"]):
        damage *= 0.25
        _say("BLOCKED!", 0.6)
    else:
        defender["hurt"] = 0.20
        _say(titles[attacker_char] + " COMBO!", 0.8)

    defender["hp"] = maxf(0.0, float(defender["hp"]) - damage)
    var defender_vel: Vector2 = defender["vel"]
    defender_vel.x = attacker_facing * (90.0 if attack_name == "light" else 155.0)
    if attack_name == "heavy":
        defender_vel.y = -35.0
    defender["vel"] = defender_vel
    defender["spark"] = 0.13
    defender["spark_pos"] = defender_pos + Vector2(-attacker_facing * 18.0, -40.0)

func _resolve_push() -> void:
    var player_pos: Vector2 = player["pos"]
    var cpu_pos: Vector2 = cpu["pos"]
    var dx: float = cpu_pos.x - player_pos.x

    if absf(dx) < 30.0:
        var overlap: float = 30.0 - absf(dx)
        var direction: float = 1.0 if dx >= 0.0 else -1.0
        player_pos.x -= direction * overlap * 0.5
        cpu_pos.x += direction * overlap * 0.5
        player["pos"] = player_pos
        cpu["pos"] = cpu_pos

func _update_coffee(delta: float) -> void:
    if not coffee_active:
        coffee_spawn_timer -= delta
        if coffee_spawn_timer <= 0.0:
            coffee_active = true
            coffee_pos = Vector2(rng.randf_range(155.0, 325.0), FLOOR - 7.0)
            _say("OSH COFFEE SPAWNED", 1.2)
        return

    var player_pos: Vector2 = player["pos"]
    var cpu_pos: Vector2 = cpu["pos"]
    if player_pos.distance_to(Vector2(coffee_pos.x, FLOOR)) < 28.0:
        _drink_coffee(player)
    elif cpu_pos.distance_to(Vector2(coffee_pos.x, FLOOR)) < 28.0:
        _drink_coffee(cpu)

func _drink_coffee(fighter: Dictionary) -> void:
    fighter["hp"] = minf(100.0, float(fighter["hp"]) + 20.0)
    fighter["buff"] = 4.0
    coffee_active = false
    coffee_spawn_timer = rng.randf_range(8.0, 13.0)
    _say(titles[int(fighter["char"])] + " DRINKS OSH COFFEE", 1.2)

func _fighter_state(fighter: Dictionary) -> String:
    if round_over and float(fighter["hp"]) > 0.0:
        return "victory"
    if float(fighter["hurt"]) > 0.0:
        return "hurt"
    if bool(fighter["block"]):
        return "block"
    if String(fighter["atk"]) != "":
        return String(fighter["atk"])

    var pos: Vector2 = fighter["pos"]
    if pos.y < FLOOR - 1.0:
        return "jump"

    var vel: Vector2 = fighter["vel"]
    if absf(vel.x) > 6.0:
        return "walk"
    return "idle"

func _fighter_texture(fighter: Dictionary) -> Texture2D:
    var state_name := _fighter_state(fighter)
    var char_name := names[int(fighter["char"])]
    var state_frames: Array = frames[char_name][state_name]
    if state_frames.is_empty():
        return null

    var frame_index: int = int(anim_time * 8.0) % state_frames.size()
    if state_name == "light" or state_name == "heavy":
        var full_duration: float = 0.26 if state_name == "light" else 0.44
        var progress: float = 1.0 - clampf(float(fighter["atk_timer"]) / full_duration, 0.0, 1.0)
        frame_index = mini(state_frames.size() - 1, int(progress * float(state_frames.size())))

    return state_frames[frame_index] as Texture2D

func _input(event: InputEvent) -> void:
    if event is InputEventKey:
        var key_event := event as InputEventKey
        if key_event.pressed and not key_event.echo:
            _handle_key(key_event.keycode)
    elif event is InputEventScreenTouch:
        var touch_event := event as InputEventScreenTouch
        _touch_screen(touch_event.position, touch_event.pressed)
    elif event is InputEventScreenDrag:
        var drag_event := event as InputEventScreenDrag
        _clear_touch()
        _touch_screen(drag_event.position, true)

    queue_redraw()

func _handle_key(keycode: Key) -> void:
    if keycode == KEY_ESCAPE:
        if mode == "fight":
            paused = not paused
        elif mode != "menu":
            mode = "menu"
        return

    if mode == "menu":
        if keycode == KEY_UP or keycode == KEY_W:
            menu_index = (menu_index - 1 + menu_items.size()) % menu_items.size()
        elif keycode == KEY_DOWN or keycode == KEY_S:
            menu_index = (menu_index + 1) % menu_items.size()
        elif keycode == KEY_ENTER or keycode == KEY_SPACE:
            _choose_menu()
        return

    if mode == "select":
        if keycode == KEY_LEFT or keycode == KEY_A:
            select_index = (select_index - 1 + names.size()) % names.size()
        elif keycode == KEY_RIGHT or keycode == KEY_D:
            select_index = (select_index + 1) % names.size()
        elif keycode == KEY_ENTER or keycode == KEY_SPACE:
            _start_match(select_index)
        return

    if mode == "results":
        if keycode == KEY_R:
            _start_match(player_char)
        elif keycode == KEY_ENTER or keycode == KEY_SPACE:
            mode = "menu"

func _choose_menu() -> void:
    var choice := menu_items[menu_index]
    if choice == "ARCADE" or choice == "VS CPU":
        mode = "select"
    elif choice == "CONTROLS":
        mode = "controls"
    elif choice == "CREDITS":
        mode = "credits"
    elif choice == "EXIT":
        get_tree().quit()

func _touch_screen(screen_pos: Vector2, pressed: bool) -> void:
    if not pressed:
        _clear_touch()
        return

    var viewport_size := get_viewport_rect().size
    if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
        return
    var p := screen_pos * Vector2(W / viewport_size.x, H / viewport_size.y)

    if mode == "menu":
        if p.x < 230.0 and p.y > 110.0:
            menu_index = clampi(int((p.y - 117.0) / 24.0), 0, menu_items.size() - 1)
            _choose_menu()
        return

    if mode == "select":
        select_index = clampi(int(p.x / 160.0), 0, names.size() - 1)
        _start_match(select_index)
        return

    if mode != "fight" or p.y <= 205.0:
        return

    if p.x < 65.0:
        touch["left"] = true
    elif p.x < 125.0:
        touch["right"] = true
    elif p.x < 190.0:
        touch["jump"] = true
    elif p.x > 415.0:
        touch["block"] = true
    elif p.x > 350.0:
        touch["heavy"] = true
    elif p.x > 285.0:
        touch["light"] = true

func _clear_touch() -> void:
    for key in touch.keys():
        touch[key] = false

func _draw() -> void:
    if mode == "menu":
        _draw_menu()
    elif mode == "select":
        _draw_select()
    elif mode == "controls":
        _draw_page("CONTROLS", [
            "A / D  MOVE",
            "W      JUMP",
            "J      LIGHT ATTACK",
            "K      HEAVY ATTACK",
            "L      BLOCK",
            "ESC    PAUSE / BACK",
            "ANDROID: TOUCH BUTTONS",
        ])
    elif mode == "credits":
        _draw_page("CREDITS", [
            "OSH COFFEE CLASH v2",
            "GODOT 4.5",
            "100 GENERATED ASSET FILES",
            "ORIGINAL GAME ART",
            "NO RIPPED COMMERCIAL SPRITES",
        ])
    elif mode == "fight":
        _draw_fight()
    elif mode == "results":
        _draw_results()
    else:
        _draw_menu()

func _draw_menu() -> void:
    if stage != null:
        draw_texture_rect(stage, Rect2(0, 0, W, H), false, Color(0.55, 0.48, 0.48, 1.0))
    else:
        draw_rect(Rect2(0, 0, W, H), Color("2b2630"))
    draw_rect(Rect2(0, 0, W, H), Color(0, 0, 0, 0.58))

    var font := ThemeDB.fallback_font
    draw_string(font, Vector2(35, 58), "OSH COFFEE", HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color("ffd24d"))
    draw_string(font, Vector2(35, 88), "CLASH", HORIZONTAL_ALIGNMENT_LEFT, -1, 34, Color("ff493e"))
    draw_string(font, Vector2(35, 105), "PIXEL MEME FIGHTER", HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color("eeeeee"))

    for i in range(menu_items.size()):
        var y := 130.0 + float(i) * 24.0
        if i == menu_index:
            draw_rect(Rect2(32, y - 15, 180, 20), Color(0.75, 0.18, 0.12, 0.82))
        var prefix := "▶ " if i == menu_index else "  "
        draw_string(font, Vector2(42, y), prefix + menu_items[i], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.WHITE)

    draw_string(font, Vector2(282, 235), "ENTER / TAP TO SELECT", HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color("ffe4a8"))

func _draw_select() -> void:
    draw_rect(Rect2(0, 0, W, H), Color("10111a"))
    var font := ThemeDB.fallback_font
    draw_string(font, Vector2(140, 30), "CHARACTER SELECT", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("ffd75f"))

    for i in range(names.size()):
        var x := 28.0 + float(i) * 154.0
        draw_rect(Rect2(x, 54, 132, 144), Color("181823"))
        var border := Color("ffce55") if i == select_index else Color("555566")
        draw_rect(Rect2(x, 54, 132, 144), border, false, 3.0)
        var portrait: Texture2D = portraits.get(names[i]) as Texture2D
        if portrait != null:
            draw_texture_rect(portrait, Rect2(x + 6, 60, 120, 100), true)
        draw_string(font, Vector2(x + 5, 178), titles[i], HORIZONTAL_ALIGNMENT_CENTER, 122, 11, Color.WHITE)
        draw_string(font, Vector2(x + 5, 194), quotes[i], HORIZONTAL_ALIGNMENT_CENTER, 122, 8, Color("ffd7a2"))

    draw_string(font, Vector2(118, 232), "← → CHOOSE   ENTER FIGHT", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("eeeeee"))

func _draw_page(title: String, lines: Array[String]) -> void:
    draw_rect(Rect2(0, 0, W, H), Color("10111a"))
    var font := ThemeDB.fallback_font
    draw_string(font, Vector2(175, 38), title, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("ffd75f"))
    for i in range(lines.size()):
        draw_string(font, Vector2(110, 82 + i * 22), lines[i], HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color.WHITE)
    draw_string(font, Vector2(145, 244), "ESC TO RETURN", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("9999aa"))

func _draw_fight() -> void:
    if stage != null:
        draw_texture_rect(stage, Rect2(0, 0, W, H), false)
    else:
        draw_rect(Rect2(0, 0, W, H), Color("58483b"))

    draw_rect(Rect2(0, 0, W, 54), Color(0, 0, 0, 0.82))
    var font := ThemeDB.fallback_font

    var player_hp := clampf(float(player["hp"]), 0.0, 100.0)
    var cpu_hp := clampf(float(cpu["hp"]), 0.0, 100.0)
    draw_rect(Rect2(14, 13, 188, 12), Color("331822"))
    draw_rect(Rect2(278, 13, 188, 12), Color("332b18"))
    draw_rect(Rect2(14, 13, 188.0 * player_hp / 100.0, 12), Color("e23f6f"))
    var cpu_width := 188.0 * cpu_hp / 100.0
    draw_rect(Rect2(466.0 - cpu_width, 13, cpu_width, 12), Color("e1ae43"))

    draw_string(font, Vector2(14, 43), titles[player_char], HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.WHITE)
    draw_string(font, Vector2(340, 43), titles[cpu_char], HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.WHITE)

    _draw_fighter_sprite(player)
    _draw_fighter_sprite(cpu)

    if coffee_active and not coffee_frames.is_empty():
        var coffee_texture := coffee_frames[int(anim_time * 6.0) % coffee_frames.size()]
        if coffee_texture != null:
            draw_texture(coffee_texture, coffee_pos - Vector2(16, 28))

    if float(player["spark"]) > 0.0 and sparks.size() > 0 and sparks[0] != null:
        draw_texture(sparks[0], Vector2(player["spark_pos"]) - Vector2(24, 24))
    if float(cpu["spark"]) > 0.0 and sparks.size() > 1 and sparks[1] != null:
        draw_texture(sparks[1], Vector2(cpu["spark_pos"]) - Vector2(24, 24))

    if message_timer > 0.0:
        draw_rect(Rect2(70, 55, 340, 24), Color(0, 0, 0, 0.75))
        draw_string(font, Vector2(78, 71), message, HORIZONTAL_ALIGNMENT_CENTER, 324, 9, Color.WHITE)

    _draw_touch_buttons()

    if paused:
        draw_rect(Rect2(120, 90, 240, 90), Color(0, 0, 0, 0.90))
        draw_string(font, Vector2(190, 130), "PAUSED", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color("ffd75f"))
        draw_string(font, Vector2(153, 154), "ESC TO RESUME", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.WHITE)

func _draw_fighter_sprite(fighter: Dictionary) -> void:
    var texture := _fighter_texture(fighter)
    if texture == null:
        return
    var pos: Vector2 = fighter["pos"]
    var facing: float = float(fighter["facing"])
    draw_set_transform(pos, 0.0, Vector2(facing, 1.0))
    draw_texture(texture, Vector2(-32, -88))
    draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_touch_buttons() -> void:
    var font := ThemeDB.fallback_font
    var buttons: Array = [
        [Rect2(8, 228, 50, 34), "<"],
        [Rect2(63, 228, 50, 34), ">"],
        [Rect2(118, 228, 60, 34), "JUMP"],
        [Rect2(293, 228, 55, 34), "J"],
        [Rect2(353, 228, 55, 34), "K"],
        [Rect2(413, 228, 59, 34), "BLOCK"],
    ]
    for item in buttons:
        var rect: Rect2 = item[0]
        var label: String = item[1]
        draw_rect(rect, Color(0.08, 0.07, 0.11, 0.70))
        draw_rect(rect, Color("d6a341"), false, 1.0)
        draw_string(font, Vector2(rect.position.x, rect.position.y + 21), label, HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, 9, Color.WHITE)

func _draw_results() -> void:
    draw_rect(Rect2(0, 0, W, H), Color("0e0f17"))
    var player_won := float(cpu["hp"]) <= 0.0
    var winner_index := player_char if player_won else cpu_char
    var winner_name := names[winner_index]
    var win_portrait: Texture2D = portraits.get(winner_name + "_win") as Texture2D

    if win_portrait != null:
        draw_texture_rect(win_portrait, Rect2(40, 36, 190, 190), true)

    var font := ThemeDB.fallback_font
    draw_string(font, Vector2(255, 70), titles[winner_index], HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("ffd75f"))
    draw_string(font, Vector2(255, 101), "WINS!", HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color("ff493e"))
    draw_string(font, Vector2(255, 130), quotes[winner_index], HORIZONTAL_ALIGNMENT_LEFT, 200, 10, Color.WHITE)
    draw_string(font, Vector2(255, 180), "R  REMATCH", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("eeeeee"))
    draw_string(font, Vector2(255, 202), "ENTER  MENU", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("eeeeee"))
