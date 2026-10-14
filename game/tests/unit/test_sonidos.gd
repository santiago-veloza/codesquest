extends GutTest

var _sonidos: SonidosLaberinto


func before_each() -> void:
	_sonidos = SonidosLaberinto.new()
	add_child_autofree(_sonidos)


func test_todos_los_sonidos_configurados_se_cargan() -> void:
	for nombre: String in ConfigLaberinto.SONIDOS:
		assert_true(_sonidos.existe(nombre), "falta el sonido %s" % nombre)


func test_reproduce_un_sonido_conocido() -> void:
	assert_true(_sonidos.reproducir("disparo"))


func test_un_nombre_desconocido_se_ignora() -> void:
	assert_false(_sonidos.reproducir("no_existe"))


func test_en_silencio_no_suena() -> void:
	_sonidos.configurar(0.8, true)
	assert_false(_sonidos.reproducir("disparo"))


func test_volumen_cero_no_suena() -> void:
	_sonidos.configurar(0.0, false)
	assert_false(_sonidos.audible())


func test_el_volumen_se_acota_entre_0_y_1() -> void:
	_sonidos.configurar(7.0, false)
	assert_eq(_sonidos.volumen, 1.0)
	_sonidos.configurar(-3.0, false)
	assert_eq(_sonidos.volumen, 0.0)
