@tool
## Solo en el editor de Godot: dibuja en la vista 2D el laberinto del mundo elegido en el Inspector
## de EscenaLaberinto (Mundo En Editor / Avatar En Editor), sin tener que ejecutar la escena.
## Al jugar (F6 o en la web) este nodo se elimina: el laberinto real lo construye la escena.
## Es un nodo aparte (y no toda la escena en @tool) para que en el editor no corran el movimiento,
## los enemigos, el puente con la web ni los sonidos.
class_name VistaPreviaLaberinto
extends Node2D

# res:// es frontend/godot/; el contenido vive en backend/content/.
const RUTA_CONTENIDO := "res://../../backend/content/mundos/mundo_%d.json"
const MUNDO_DEMO := 0
const FRACCION_CANDADO := 0.85
const RADIO_INSIGNIA := 12.0
const TAM_FUENTE := 16
const COLOR_INSIGNIA := Color("#0b1020")

var _mapa := PackedStringArray()
var _tema := ConfigLaberinto.TEMA_POR_DEFECTO
var _avatar := ConfigLaberinto.AVATAR_POR_DEFECTO
var _dibujado := "" # "mundo|avatar" que se ve ahora (se redibuja si cambia en el Inspector)
var _candados := [] # [celda, simbolo] para dibujar los números encima de los candados


func _ready() -> void:
	if not Engine.is_editor_hint():
		queue_free()


func _process(_delta: float) -> void:
	if not Engine.is_editor_hint():
		return
	var padre := get_parent()
	var mundo: Variant = padre.get("mundo_en_editor") if padre else null
	var avatar: Variant = padre.get("avatar_en_editor") if padre else null
	var clave := "%s|%s" % [mundo, avatar]
	if clave == _dibujado:
		return
	_dibujado = clave
	var datos := leer_mundo(mundo if typeof(mundo) == TYPE_INT else ConfigLaberinto.TEMA_POR_DEFECTO)
	_mapa = datos.mapa
	_tema = datos.tema
	_avatar = avatar if typeof(avatar) == TYPE_STRING else ConfigLaberinto.AVATAR_POR_DEFECTO
	_reconstruir()
	queue_redraw()


## Mapa y tema de un mundo leídos de content/mundos/mundo_N.json (0 = laberinto de demostración).
## Si el mundo no existe o no tiene laberinto, devuelve la demostración y avisa.
static func leer_mundo(mundo: int) -> Dictionary:
	var demo := {"mapa": PackedStringArray(ConfigLaberinto.MAPA_DEMO), "tema": ConfigLaberinto.TEMA_POR_DEFECTO}
	if mundo == MUNDO_DEMO:
		return demo
	var ruta := ProjectSettings.globalize_path(RUTA_CONTENIDO % mundo).simplify_path()
	if not FileAccess.file_exists(ruta):
		push_warning("No se encontró %s; se muestra el laberinto de demostración." % ruta)
		return demo
	var json := JSON.new()
	if json.parse(FileAccess.get_file_as_string(ruta)) != OK or typeof(json.data) != TYPE_DICTIONARY:
		push_warning("No se pudo leer %s; se muestra el laberinto de demostración." % ruta)
		return demo
	var datos: Dictionary = json.data
	if typeof(datos.get("mapa")) != TYPE_ARRAY or datos.mapa.is_empty():
		push_warning("El mundo %d no tiene laberinto; se muestra la demostración." % mundo)
		return demo
	return {"mapa": PackedStringArray(datos.mapa), "tema": int(datos.get("orden", mundo))}


## El suelo se dibuja aquí; las imágenes van como Sprite2D hijos (la forma estándar de Godot: con
## draw_texture_rect, en el editor salían cuadros blancos) y los números de los candados en una capa
## encima. Esos nodos se crean solo en el editor y no se guardan en la escena (no tienen dueño).
func _draw() -> void:
	var tam := float(ConfigLaberinto.TAM_CELDA)
	var camino: Color = ConfigLaberinto.paleta(_tema).camino
	for y in _mapa.size():
		for x in _mapa[y].length():
			draw_rect(Rect2(Vector2(x, y) * tam, Vector2.ONE * tam), camino)


func _reconstruir() -> void:
	for hijo in get_children():
		remove_child(hijo)
		hijo.queue_free()
	if _mapa.is_empty():
		return
	var tam := float(ConfigLaberinto.TAM_CELDA)
	var tema_arte: Dictionary = ConfigLaberinto.TEXTURAS_TEMA.get(_tema, ConfigLaberinto.TEXTURAS_TEMA[ConfigLaberinto.TEMA_POR_DEFECTO])
	var arte_enemigo: Dictionary = ConfigLaberinto.ENEMIGOS_TEMA.get(_tema, ConfigLaberinto.ENEMIGOS_TEMA[ConfigLaberinto.TEMA_POR_DEFECTO])
	var pose_enemigo: String = arte_enemigo.get("caminar", ConfigLaberinto.POSES_ENEMIGO_POR_DEFECTO)[0]
	var color_avatar: String = ConfigLaberinto.AVATARES.get(_avatar, ConfigLaberinto.AVATARES[ConfigLaberinto.AVATAR_POR_DEFECTO])
	var texturas := {
		"w": _textura(tema_arte.pared),
		"s": _textura(ConfigLaberinto.PUERTA_CERRADA),
		"a": _textura("personajes/character_%s_front.png" % color_avatar),
		"e": _textura("enemigos/%s_%s.png" % [arte_enemigo.sprite, pose_enemigo]),
		"candado": _textura(tema_arte.candado),
	}
	_diagnostico(texturas)
	_candados.clear()
	for y in _mapa.size():
		for x in _mapa[y].length():
			var simbolo := _mapa[y][x]
			var celda := Rect2(Vector2(x, y) * tam, Vector2.ONE * tam)
			if texturas.has(simbolo):
				_agregar_sprite(texturas[simbolo], celda, 1.0)
			elif simbolo.is_valid_int():
				_agregar_sprite(texturas.candado, celda, FRACCION_CANDADO)
				_candados.append([celda, simbolo])
	var insignias := Node2D.new()
	insignias.draw.connect(_dibujar_insignias.bind(insignias, ConfigLaberinto.paleta(_tema).obstaculo))
	add_child(insignias)


func _agregar_sprite(textura: Texture2D, celda: Rect2, fraccion: float) -> void:
	if textura == null:
		return
	var sprite := Sprite2D.new()
	sprite.texture = textura
	sprite.position = celda.get_center()
	sprite.scale = Vector2.ONE * (celda.size.x * fraccion / textura.get_width())
	add_child(sprite)


func _dibujar_insignias(capa: Node2D, color: Color) -> void:
	for dato in _candados:
		var celda: Rect2 = dato[0]
		var centro := celda.position + Vector2(celda.size.x - RADIO_INSIGNIA, RADIO_INSIGNIA)
		capa.draw_circle(centro, RADIO_INSIGNIA, COLOR_INSIGNIA)
		capa.draw_arc(centro, RADIO_INSIGNIA, 0.0, TAU, 24, color, 2.0)
		var base := centro + Vector2(-RADIO_INSIGNIA, TAM_FUENTE / 3.0)
		capa.draw_string(ThemeDB.fallback_font, base, dato[1], HORIZONTAL_ALIGNMENT_CENTER, RADIO_INSIGNIA * 2, TAM_FUENTE, Color.WHITE)


## Una línea en la pestaña Salida con lo que cargó (útil si algo no se ve).
func _diagnostico(texturas: Dictionary) -> void:
	var partes: Array[String] = []
	for clave: String in texturas:
		var t: Texture2D = texturas[clave]
		partes.append("%s=%s" % [clave, "%dx%d" % [t.get_width(), t.get_height()] if t else "NO CARGÓ"])
	print("Vista previa (mundo %s): %s" % [_dibujado.get_slice("|", 0), ", ".join(partes)])


## Carga directa desde este script de herramienta. Si una imagen falta, se avisa en la pestaña Salida.
func _textura(ruta_relativa: String) -> Texture2D:
	var textura := load(ConfigLaberinto.RUTA_SPRITES + ruta_relativa) as Texture2D
	if textura == null:
		push_warning("Vista previa: no se pudo cargar %s" % (ConfigLaberinto.RUTA_SPRITES + ruta_relativa))
	return textura
