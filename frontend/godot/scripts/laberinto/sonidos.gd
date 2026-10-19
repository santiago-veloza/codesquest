## Efectos de sonido del laberinto. Un grupo pequeño de reproductores para que varios sonidos
## puedan sonar a la vez. El volumen lo decide el jugador en la página (configurar()).
class_name SonidosLaberinto
extends Node

var volumen := ConfigLaberinto.VOLUMEN_POR_DEFECTO
var silencio := false

var _sonidos := {} # nombre -> AudioStream
var _reproductores: Array[AudioStreamPlayer] = []
var _siguiente := 0


func _ready() -> void:
	for nombre: String in ConfigLaberinto.SONIDOS:
		_sonidos[nombre] = load(ConfigLaberinto.RUTA_SONIDOS + ConfigLaberinto.SONIDOS[nombre])
	for i in ConfigLaberinto.REPRODUCTORES_SIMULTANEOS:
		var reproductor := AudioStreamPlayer.new()
		add_child(reproductor)
		_reproductores.append(reproductor)


## Volumen lineal 0-1 (se acota: llega desde la página, entrada no confiable).
func configurar(nuevo_volumen: float, nuevo_silencio: bool) -> void:
	volumen = clampf(nuevo_volumen, 0.0, 1.0)
	silencio = nuevo_silencio


func audible() -> bool:
	return not silencio and volumen > 0.0


## Devuelve true si sonó (false si está en silencio o el nombre no existe).
func reproducir(nombre: String) -> bool:
	if not audible() or not _sonidos.has(nombre) or _reproductores.is_empty():
		return false
	var reproductor := _reproductores[_siguiente]
	_siguiente = (_siguiente + 1) % _reproductores.size()
	reproductor.stream = _sonidos[nombre]
	reproductor.volume_db = linear_to_db(volumen)
	reproductor.play()
	return true


func existe(nombre: String) -> bool:
	return _sonidos.has(nombre)
