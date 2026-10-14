extends GutTest

var _p: Protagonista


func before_each() -> void:
	_p = Protagonista.new()
	_p.movimiento_reducido = true # Animaciones cortas para que las pruebas sean rápidas.
	add_child_autofree(_p)


func test_avanzar_mueve_un_paso() -> void:
	await _p.ejecutar("avanzar")
	assert_almost_eq(_p.position.x, ConfigEscena.PASO_PX, 0.01)


func test_saltar_vuelve_al_suelo() -> void:
	await _p.ejecutar("saltar")
	assert_almost_eq(_p.position.y, 0.0, 0.01)


func test_atacar_no_desplaza_ni_deja_girado() -> void:
	await _p.ejecutar("atacar")
	assert_eq(_p.position, Vector2.ZERO)
	assert_almost_eq(_p.rotation, 0.0, 0.001)


func test_esperar_no_mueve() -> void:
	await _p.ejecutar("esperar")
	assert_eq(_p.position, Vector2.ZERO)
