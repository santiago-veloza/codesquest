## Dibuja el suelo, las paredes (tiles del tema del mundo) y la puerta de salida.
class_name TableroLaberinto
extends Node2D

var _laberinto: Laberinto
var _paleta: Dictionary
var _pared: Texture2D
var _puerta_cerrada: Texture2D
var _puerta_abierta: Texture2D


func construir(laberinto: Laberinto, paleta: Dictionary, tema: int) -> void:
	_laberinto = laberinto
	_paleta = paleta
	_pared = ConfigLaberinto.textura(ConfigLaberinto.texturas_tema(tema).pared)
	_puerta_cerrada = ConfigLaberinto.textura(ConfigLaberinto.PUERTA_CERRADA)
	_puerta_abierta = ConfigLaberinto.textura(ConfigLaberinto.PUERTA_ABIERTA)
	queue_redraw()


## La puerta de salida se abre cuando todos los obstáculos están resueltos.
func actualizar() -> void:
	queue_redraw()


func _draw() -> void:
	if _laberinto == null:
		return
	var tam := float(ConfigLaberinto.TAM_CELDA)
	for y in _laberinto.alto():
		for x in _laberinto.ancho():
			var celda := Vector2i(x, y)
			var rect := Rect2(Vector2(celda) * tam, Vector2.ONE * tam)
			draw_rect(rect, _paleta.camino)
			if _laberinto.simbolo(celda) == Laberinto.PARED:
				draw_texture_rect(_pared, rect, false)
	var salida := _laberinto.buscar(Laberinto.SALIDA)
	var puerta := _puerta_abierta if _laberinto.todos_resueltos() else _puerta_cerrada
	draw_texture_rect(puerta, Rect2(Vector2(salida) * tam, Vector2.ONE * tam), false)
