## Obstáculo del laberinto (un desafío): un candado con su número. Bloquea hasta resolver el desafío.
class_name ObstaculoLaberinto
extends Node2D

const TAM_CANDADO := 56.0
const RADIO_INSIGNIA := 12.0
const TAM_FUENTE := 16
const LATIDO_ESCALA := 1.08
const LATIDO_S := 0.8

var simbolo := ""
var _color := Color.WHITE
var _candado: Texture2D
var _latido: Tween


func configurar(nuevo_simbolo: String, celda: Vector2i, color: Color, tema: int, movimiento_reducido: bool) -> void:
	simbolo = nuevo_simbolo
	_color = color
	_candado = ConfigLaberinto.textura(ConfigLaberinto.texturas_tema(tema).candado)
	position = ConfigLaberinto.centro_de(celda)
	queue_redraw()
	if not movimiento_reducido:
		_latido = create_tween().set_loops()
		_latido.tween_property(self, "scale", Vector2.ONE * LATIDO_ESCALA, LATIDO_S)
		_latido.tween_property(self, "scale", Vector2.ONE, LATIDO_S)


func _draw() -> void:
	var mitad := TAM_CANDADO / 2.0
	draw_texture_rect(_candado, Rect2(Vector2(-mitad, -mitad), Vector2.ONE * TAM_CANDADO), false)
	# Insignia con el número del desafío en la esquina superior derecha.
	var centro := Vector2(mitad - 4.0, -mitad + 4.0)
	draw_circle(centro, RADIO_INSIGNIA, Color("#0b1020"))
	draw_arc(centro, RADIO_INSIGNIA, 0.0, TAU, 24, _color, 2.0)
	var fuente := ThemeDB.fallback_font
	var base := centro + Vector2(-RADIO_INSIGNIA, TAM_FUENTE / 3.0)
	draw_string(fuente, base, simbolo, HORIZONTAL_ALIGNMENT_CENTER, RADIO_INSIGNIA * 2, TAM_FUENTE, Color.WHITE)


## Animación de "obstáculo superado"; al terminar se elimina.
func desaparecer(movimiento_reducido: bool) -> void:
	if _latido:
		_latido.kill()
	if movimiento_reducido:
		queue_free()
		return
	var tween := create_tween().set_parallel()
	tween.tween_property(self, "scale", Vector2.ZERO, ConfigLaberinto.DURACION_DESAPARECER_S)
	tween.tween_property(self, "rotation", PI, ConfigLaberinto.DURACION_DESAPARECER_S)
	tween.tween_property(self, "modulate:a", 0.0, ConfigLaberinto.DURACION_DESAPARECER_S)
	await tween.finished
	queue_free()
