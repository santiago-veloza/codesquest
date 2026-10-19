## Lógica pura del laberinto (sin dibujo ni entrada): qué pasa al intentar pisar una casilla.
## Leyenda (igual que content/mundos/*.json): w pared, c camino, a inicio, s salida, 1-9 obstáculo.
class_name Laberinto
extends RefCounted

enum Paso { LIBRE, PARED, OBSTACULO, SALIDA_CERRADA, SALIDA_ABIERTA }

const PARED := "w"
const INICIO := "a"
const SALIDA := "s"

var filas: PackedStringArray
var _resueltos := {}


func _init(mapa: PackedStringArray, simbolos_resueltos: Array = []) -> void:
	filas = mapa
	for simbolo in simbolos_resueltos:
		_resueltos[str(simbolo)] = true


func ancho() -> int:
	return filas[0].length() if filas.size() > 0 else 0


func alto() -> int:
	return filas.size()


func dentro(celda: Vector2i) -> bool:
	return celda.y >= 0 and celda.y < alto() and celda.x >= 0 and celda.x < filas[celda.y].length()


func simbolo(celda: Vector2i) -> String:
	return filas[celda.y][celda.x] if dentro(celda) else PARED


func buscar(buscado: String) -> Vector2i:
	for y in alto():
		var x := filas[y].find(buscado)
		if x != -1:
			return Vector2i(x, y)
	return Vector2i(-1, -1)


func inicio() -> Vector2i:
	return buscar(INICIO)


static func es_obstaculo(s: String) -> bool:
	return s.length() == 1 and s.is_valid_int()


## {simbolo: celda} de todos los obstáculos del mapa.
func obstaculos() -> Dictionary:
	var encontrados := {}
	for y in alto():
		for x in filas[y].length():
			var s := filas[y][x]
			if es_obstaculo(s):
				encontrados[s] = Vector2i(x, y)
	return encontrados


## Casillas donde aparecen los enemigos (símbolo "e"; el suelo debajo es camino).
func enemigos() -> Array[Vector2i]:
	var encontrados: Array[Vector2i] = []
	for y in alto():
		for x in filas[y].length():
			if filas[y][x] == ConfigLaberinto.SIMBOLO_ENEMIGO:
				encontrados.append(Vector2i(x, y))
	return encontrados


func esta_resuelto(s: String) -> bool:
	return _resueltos.has(s)


func resolver(s: String) -> void:
	_resueltos[s] = true


func pendientes() -> int:
	return obstaculos().keys().filter(func(s): return not esta_resuelto(s)).size()


func todos_resueltos() -> bool:
	return pendientes() == 0


func evaluar_paso(destino: Vector2i) -> Paso:
	var s := simbolo(destino)
	if s == PARED:
		return Paso.PARED
	if es_obstaculo(s) and not esta_resuelto(s):
		return Paso.OBSTACULO
	if s == SALIDA:
		return Paso.SALIDA_ABIERTA if todos_resueltos() else Paso.SALIDA_CERRADA
	return Paso.LIBRE
