extends GutTest

# Pasillo horizontal con un cruce hacia abajo en x=3, un obstáculo en x=5 y la salida al final.
const MAPA := [
	"wwwwwwwww",
	"wacecc1sw",
	"wwwcwwwww",
	"wwwcwwwww",
	"wwwwwwwww",
]

var _rng: RandomNumberGenerator


func before_each() -> void:
	_rng = RandomNumberGenerator.new()
	_rng.seed = ConfigLaberinto.SEMILLA_PATRULLA


func _laberinto(resueltos: Array = []) -> Laberinto:
	return Laberinto.new(PackedStringArray(MAPA), resueltos)


func test_encuentra_los_puntos_de_aparicion_de_enemigos() -> void:
	assert_eq(_laberinto().enemigos(), [Vector2i(3, 1)] as Array[Vector2i])


func test_la_casilla_del_enemigo_es_camino_para_el_jugador() -> void:
	assert_eq(_laberinto().evaluar_paso(Vector2i(3, 1)), Laberinto.Paso.LIBRE)


func test_los_enemigos_no_pisan_paredes_obstaculos_pendientes_ni_la_salida() -> void:
	var l := _laberinto()
	assert_false(Patrulla.puede_pisar(l, Vector2i(0, 1)))
	assert_false(Patrulla.puede_pisar(l, Vector2i(6, 1)))
	assert_false(Patrulla.puede_pisar(l, Vector2i(7, 1)))
	assert_true(Patrulla.puede_pisar(l, Vector2i(4, 1)))


func test_un_obstaculo_resuelto_ya_es_camino_para_los_enemigos() -> void:
	assert_true(Patrulla.puede_pisar(_laberinto(["1"]), Vector2i(6, 1)))


func test_en_un_pasillo_sigue_recto() -> void:
	var l := _laberinto()
	# En (4,1) mirando a la derecha: solo puede seguir a (5,1) sin dar media vuelta.
	assert_eq(Patrulla.siguiente_direccion(l, Vector2i(4, 1), Vector2i.RIGHT, {}, _rng), Vector2i.RIGHT)


func test_en_un_callejon_da_media_vuelta() -> void:
	var l := _laberinto()
	# En (5,1) mirando a la derecha: delante está el obstáculo 1, solo queda volver.
	assert_eq(Patrulla.siguiente_direccion(l, Vector2i(5, 1), Vector2i.RIGHT, {}, _rng), Vector2i.LEFT)


func test_en_un_cruce_nunca_da_media_vuelta() -> void:
	var l := _laberinto()
	for i in 20:
		var d := Patrulla.siguiente_direccion(l, Vector2i(3, 1), Vector2i.RIGHT, {}, _rng)
		assert_ne(d, Vector2i.LEFT)


func test_no_se_mete_donde_hay_otro_enemigo() -> void:
	var l := _laberinto()
	var ocupadas := {Vector2i(5, 1): true}
	assert_eq(Patrulla.siguiente_direccion(l, Vector2i(4, 1), Vector2i.RIGHT, ocupadas, _rng), Vector2i.LEFT)


func test_sin_salida_ni_espacio_se_queda_quieto() -> void:
	var l := Laberinto.new(PackedStringArray(["wwwww", "waews", "wwwww"]))
	var ocupadas := {Vector2i(1, 1): true}
	assert_eq(Patrulla.siguiente_direccion(l, Vector2i(2, 1), Vector2i.RIGHT, ocupadas, _rng), Vector2i.ZERO)


func test_el_disparo_avanza_hasta_chocar_con_algo_solido() -> void:
	var l := _laberinto()
	var casillas := Patrulla.trayectoria(l, Vector2i(1, 1), Vector2i.RIGHT)
	assert_eq(casillas, [Vector2i(2, 1), Vector2i(3, 1), Vector2i(4, 1), Vector2i(5, 1)] as Array[Vector2i])


func test_el_disparo_contra_una_pared_no_recorre_nada() -> void:
	assert_eq(Patrulla.trayectoria(_laberinto(), Vector2i(1, 1), Vector2i.UP).size(), 0)


func test_existen_los_sprites_de_enemigos_y_del_disparo() -> void:
	for tema: int in ConfigLaberinto.ENEMIGOS_TEMA:
		for pose: String in ConfigLaberinto.poses_enemigo(tema) + [ConfigLaberinto.enemigo_tema(tema).derrotado]:
			var ruta := ConfigLaberinto.RUTA_SPRITES + ConfigLaberinto.ruta_enemigo(tema, pose)
			assert_true(ResourceLoader.exists(ruta), "falta %s" % ruta)
	assert_true(ResourceLoader.exists(ConfigLaberinto.RUTA_SPRITES + ConfigLaberinto.PROYECTIL))


func test_el_contrato_acepta_mapas_con_enemigos() -> void:
	assert_true(ContratoLaberinto.validar(JSON.stringify({"mapa": MAPA})).ok)
