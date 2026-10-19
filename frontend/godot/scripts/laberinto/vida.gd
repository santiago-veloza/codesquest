## Vida del jugador en una partida del laberinto (lógica pura: se prueba sin escena).
class_name VidaJugador
extends RefCounted

var vida := ConfigLaberinto.VIDA_MAXIMA
var _ultimo_golpe_ms := -1000000


func reiniciar() -> void:
	vida = ConfigLaberinto.VIDA_MAXIMA
	_ultimo_golpe_ms = -1000000


func esta_vivo() -> bool:
	return vida > 0


## Aplica un golpe de enemigo. Devuelve false si no hizo daño (invulnerable o ya sin vida).
func recibir_golpe(ahora_ms: int) -> bool:
	if not esta_vivo() or ahora_ms - _ultimo_golpe_ms < ConfigLaberinto.INVULNERABLE_TRAS_GOLPE_S * 1000:
		return false
	_ultimo_golpe_ms = ahora_ms
	vida = maxi(vida - ConfigLaberinto.DANO_ENEMIGO, 0)
	return true


func porcentaje() -> int:
	return roundi(100.0 * vida / ConfigLaberinto.VIDA_MAXIMA)


## Estado de cada corazón: "lleno", "medio" o "vacio".
func corazones() -> Array[String]:
	var por_corazon := float(ConfigLaberinto.VIDA_MAXIMA) / ConfigLaberinto.CORAZONES
	var estados: Array[String] = []
	for i in ConfigLaberinto.CORAZONES:
		var resto := vida - i * por_corazon
		estados.append("lleno" if resto >= por_corazon else ("medio" if resto > 0 else "vacio"))
	return estados
