extends GutTest

var _vida: VidaJugador
var _ahora := 0


func before_each() -> void:
	_vida = VidaJugador.new()
	_ahora = 10000


func _golpear() -> bool:
	_ahora += int(ConfigLaberinto.INVULNERABLE_TRAS_GOLPE_S * 1000) + 1
	return _vida.recibir_golpe(_ahora)


func test_empieza_con_la_vida_llena() -> void:
	assert_eq(_vida.porcentaje(), 100)
	assert_eq(_vida.corazones(), ["lleno", "lleno", "lleno", "lleno", "lleno"] as Array[String])


func test_cada_golpe_quita_el_diez_por_ciento() -> void:
	_golpear()
	assert_eq(_vida.porcentaje(), 90)
	assert_eq(_vida.corazones(), ["lleno", "lleno", "lleno", "lleno", "medio"] as Array[String])


func test_tras_un_golpe_hay_un_momento_de_invulnerabilidad() -> void:
	_golpear()
	assert_false(_vida.recibir_golpe(_ahora + 100))
	assert_eq(_vida.porcentaje(), 90)


func test_diez_golpes_es_game_over() -> void:
	for i in 9:
		_golpear()
	assert_true(_vida.esta_vivo())
	_golpear()
	assert_false(_vida.esta_vivo())
	assert_eq(_vida.corazones(), ["vacio", "vacio", "vacio", "vacio", "vacio"] as Array[String])
	assert_false(_golpear(), "sin vida ya no recibe más golpes")


func test_reiniciar_devuelve_la_vida_llena() -> void:
	for i in 10:
		_golpear()
	_vida.reiniciar()
	assert_eq(_vida.porcentaje(), 100)
	assert_true(_golpear())
