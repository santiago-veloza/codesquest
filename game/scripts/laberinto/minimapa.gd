## Mapa pequeño en la esquina superior derecha: todo el laberinto, los obstáculos y el jugador.
class_name Minimapa
extends Control

const OPACIDAD_FONDO := 0.85
const COLOR_ENEMIGO := Color("#f87171")

var _laberinto: Laberinto
var _paleta: Dictionary
var _jugador: JugadorLaberinto
var _enemigos: Array[EnemigoLaberinto] = []
var _escala := 1.0


func configurar(laberinto: Laberinto, paleta: Dictionary, jugador: JugadorLaberinto, enemigos: Array[EnemigoLaberinto]) -> void:
	_enemigos = enemigos
	_laberinto = laberinto
	_paleta = paleta
	_jugador = jugador
	var maximo := ConfigLaberinto.MINIMAPA_MAX
	_escala = minf(maximo.x / laberinto.ancho(), maximo.y / laberinto.alto())
	size = Vector2(laberinto.ancho(), laberinto.alto()) * _escala
	# Esquina superior derecha de la pantalla.
	set_anchors_preset(Control.PRESET_TOP_RIGHT)
	position = Vector2(get_viewport_rect().size.x - size.x - ConfigLaberinto.MINIMAPA_MARGEN, ConfigLaberinto.MINIMAPA_MARGEN)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()


func _draw() -> void:
	if _laberinto == null:
		return
	var fondo: Color = _paleta.fondo
	fondo.a = OPACIDAD_FONDO
	draw_rect(Rect2(Vector2.ZERO, size).grow(4), fondo)
	for y in _laberinto.alto():
		for x in _laberinto.ancho():
			var celda := Vector2i(x, y)
			var s := _laberinto.simbolo(celda)
			var color: Color = _paleta.camino.lightened(0.15)
			if s == Laberinto.PARED:
				color = _paleta.pared
			elif Laberinto.es_obstaculo(s) and not _laberinto.esta_resuelto(s):
				color = _paleta.obstaculo
			elif s == Laberinto.SALIDA:
				color = _paleta.salida
			draw_rect(Rect2(Vector2(celda) * _escala, Vector2.ONE * _escala), color)
	for enemigo in _enemigos:
		if enemigo.vivo:
			var posicion := (Vector2(enemigo.celda) + Vector2.ONE * 0.5) * _escala
			draw_circle(posicion, maxf(ConfigLaberinto.MINIMAPA_PUNTO_JUGADOR, _escala * 0.5), COLOR_ENEMIGO)
	if _jugador:
		var centro := (Vector2(_jugador.celda) + Vector2.ONE * 0.5) * _escala
		draw_circle(centro, maxf(ConfigLaberinto.MINIMAPA_PUNTO_JUGADOR, _escala * 0.6), _paleta.jugador)
	draw_rect(Rect2(Vector2.ZERO, size).grow(4), _paleta.borde, false, 2.0)
