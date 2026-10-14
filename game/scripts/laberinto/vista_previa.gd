@tool
## Solo en el editor de Godot: dibuja en la vista 2D el laberinto del mundo elegido en el Inspector
## de EscenaLaberinto (Mundo En Editor / Avatar En Editor), sin tener que ejecutar la escena.
## Al jugar (F6 o en la web) este nodo se elimina: el laberinto real lo construye la escena.
## Es un nodo aparte (y no toda la escena en @tool) para que en el editor no corran el movimiento,
## los enemigos, el puente con la web ni los sonidos.
class_name VistaPreviaLaberinto
extends Node2D

const RUTA_CONTENIDO := "res://../content/mundos/mundo_%d.json"
const MUNDO_DEMO := 0
const FRACCION_CANDADO := 0.85
const RADIO_INSIGNIA := 12.0
const TAM_FUENTE := 16
const COLOR_INSIGNIA := Color("#0b1020")

var _mapa := PackedStringArray()
var _tema := ConfigLaberinto.TEMA_POR_DEFECTO
var _avatar := ConfigLaberinto.AVATAR_POR_DEFECTO
var _dibujado := "" # "mundo|avatar" que se ve ahora (se redibuja si cambia en el Inspector)


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


func _draw() -> void:
	if _mapa.is_empty():
		return
	var tam := float(ConfigLaberinto.TAM_CELDA)
	var paleta := ConfigLaberinto.paleta(_tema)
	var tema_arte: Dictionary = ConfigLaberinto.TEXTURAS_TEMA.get(_tema, ConfigLaberinto.TEXTURAS_TEMA[ConfigLaberinto.TEMA_POR_DEFECTO])
	var sprite_enemigo: String = ConfigLaberinto.ENEMIGOS_TEMA.get(_tema, ConfigLaberinto.ENEMIGOS_TEMA[ConfigLaberinto.TEMA_POR_DEFECTO]).sprite
	var color_avatar: String = ConfigLaberinto.AVATARES.get(_avatar, ConfigLaberinto.AVATARES[ConfigLaberinto.AVATAR_POR_DEFECTO])
	var pared := _textura(tema_arte.pared)
	var candado := _textura(tema_arte.candado)
	var puerta := _textura(ConfigLaberinto.PUERTA_CERRADA)
	var enemigo := _textura("enemigos/%s_walk_a.png" % sprite_enemigo)
	var jugador := _textura("personajes/character_%s_front.png" % color_avatar)
	for y in _mapa.size():
		for x in _mapa[y].length():
			var simbolo := _mapa[y][x]
			var rect := Rect2(Vector2(x, y) * tam, Vector2.ONE * tam)
			draw_rect(rect, paleta.camino)
			match simbolo:
				"w":
					_pintar(pared, rect)
				"s":
					_pintar(puerta, rect)
				"a":
					_pintar(jugador, rect)
				"e":
					_pintar(enemigo, rect)
				_:
					if simbolo.is_valid_int():
						_dibujar_candado(candado, rect, simbolo, paleta.obstaculo)


## Carga directa desde este script de herramienta. (Pedírsela a ConfigLaberinto.textura(), que no es
## @tool, en el editor dibujaba cuadros blancos.) Si una imagen falta, se avisa en la pestaña Salida.
func _textura(ruta_relativa: String) -> Texture2D:
	var textura := load(ConfigLaberinto.RUTA_SPRITES + ruta_relativa) as Texture2D
	if textura == null:
		push_warning("Vista previa: no se pudo cargar %s" % (ConfigLaberinto.RUTA_SPRITES + ruta_relativa))
	return textura


## Sin textura no se dibuja nada (Godot pintaría un cuadro blanco).
func _pintar(textura: Texture2D, rect: Rect2) -> void:
	if textura:
		draw_texture_rect(textura, rect, false)


func _dibujar_candado(textura: Texture2D, celda: Rect2, simbolo: String, color: Color) -> void:
	var lado := celda.size.x * FRACCION_CANDADO
	_pintar(textura, Rect2(celda.get_center() - Vector2.ONE * lado / 2.0, Vector2.ONE * lado))
	var centro := celda.position + Vector2(celda.size.x - RADIO_INSIGNIA, RADIO_INSIGNIA)
	draw_circle(centro, RADIO_INSIGNIA, COLOR_INSIGNIA)
	draw_arc(centro, RADIO_INSIGNIA, 0.0, TAU, 24, color, 2.0)
	var base := centro + Vector2(-RADIO_INSIGNIA, TAM_FUENTE / 3.0)
	draw_string(ThemeDB.fallback_font, base, simbolo, HORIZONTAL_ALIGNMENT_CENTER, RADIO_INSIGNIA * 2, TAM_FUENTE, Color.WHITE)
