## Lógica pura de enemigos y disparos (sin dibujo): se prueba con GUT.
class_name Patrulla
extends RefCounted

const DIRECCIONES: Array[Vector2i] = [Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT, Vector2i.UP]


## Los enemigos caminan por caminos libres: no pisan paredes, obstáculos sin resolver ni la salida.
static func puede_pisar(laberinto: Laberinto, celda: Vector2i) -> bool:
	var s := laberinto.simbolo(celda)
	if s == Laberinto.PARED or s == Laberinto.SALIDA:
		return false
	return not (Laberinto.es_obstaculo(s) and not laberinto.esta_resuelto(s))


## Siguiente dirección de un enemigo: sigue recto si puede; en un cruce elige al azar sin dar media
## vuelta; si está en un callejón, da media vuelta. `ocupadas` = casillas de otros enemigos.
static func siguiente_direccion(laberinto: Laberinto, celda: Vector2i, direccion: Vector2i,
		ocupadas: Dictionary, rng: RandomNumberGenerator) -> Vector2i:
	var libres: Array[Vector2i] = []
	for d in DIRECCIONES:
		var destino := celda + d
		if puede_pisar(laberinto, destino) and not ocupadas.has(destino):
			libres.append(d)
	if libres.is_empty():
		return Vector2i.ZERO
	var sin_volver := libres.filter(func(d): return d != -direccion)
	if sin_volver.is_empty():
		return -direccion # callejón: media vuelta
	if direccion in sin_volver and rng.randf() < ConfigLaberinto.PROB_SEGUIR_RECTO:
		return direccion # prefiere seguir recto
	return sin_volver[rng.randi_range(0, sin_volver.size() - 1)]


## Casillas que recorre un disparo desde `desde` hacia `direccion` hasta chocar con algo sólido.
static func trayectoria(laberinto: Laberinto, desde: Vector2i, direccion: Vector2i) -> Array[Vector2i]:
	var casillas: Array[Vector2i] = []
	var actual := desde + direccion
	while laberinto.dentro(actual) and puede_pisar(laberinto, actual):
		casillas.append(actual)
		actual += direccion
	return casillas
