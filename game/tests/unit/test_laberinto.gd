extends GutTest

# a -> 1 -> c -> 2 -> s, con una pared en medio.
const MAPA := ["wwwwwww", "wa1c2sw", "wwwwwww"]


func _laberinto(resueltos: Array = []) -> Laberinto:
	return Laberinto.new(PackedStringArray(MAPA), resueltos)


func test_encuentra_inicio_y_obstaculos() -> void:
	var l := _laberinto()
	assert_eq(l.inicio(), Vector2i(1, 1))
	assert_eq(l.obstaculos(), {"1": Vector2i(2, 1), "2": Vector2i(4, 1)})
	assert_eq(l.pendientes(), 2)


func test_pared_y_bordes_no_se_pisan() -> void:
	var l := _laberinto()
	assert_eq(l.evaluar_paso(Vector2i(1, 0)), Laberinto.Paso.PARED)
	assert_eq(l.evaluar_paso(Vector2i(-1, 1)), Laberinto.Paso.PARED)
	assert_eq(l.evaluar_paso(Vector2i(99, 99)), Laberinto.Paso.PARED)


func test_obstaculo_pendiente_bloquea_y_resuelto_deja_pasar() -> void:
	var l := _laberinto()
	assert_eq(l.evaluar_paso(Vector2i(2, 1)), Laberinto.Paso.OBSTACULO)
	l.resolver("1")
	assert_eq(l.evaluar_paso(Vector2i(2, 1)), Laberinto.Paso.LIBRE)


func test_la_salida_se_abre_solo_con_todo_resuelto() -> void:
	var l := _laberinto(["1"])
	assert_eq(l.evaluar_paso(Vector2i(5, 1)), Laberinto.Paso.SALIDA_CERRADA)
	l.resolver("2")
	assert_true(l.todos_resueltos())
	assert_eq(l.evaluar_paso(Vector2i(5, 1)), Laberinto.Paso.SALIDA_ABIERTA)


func test_los_resueltos_guardados_se_respetan_al_cargar() -> void:
	var l := _laberinto(["1", "2"])
	assert_eq(l.pendientes(), 0)
	assert_eq(l.evaluar_paso(Vector2i(4, 1)), Laberinto.Paso.LIBRE)


# --- Contrato con la página ---

func _json(datos: Dictionary) -> String:
	return JSON.stringify(datos)


func test_contrato_acepta_un_laberinto_valido() -> void:
	var r := ContratoLaberinto.validar(_json({"mapa": MAPA, "resueltos": ["1"], "tema": 2}))
	assert_true(r.ok)
	assert_eq(r.resueltos, ["1"] as Array[String])
	assert_eq(r.tema, 2)


func test_contrato_rechaza_simbolos_extranos() -> void:
	assert_false(ContratoLaberinto.validar(_json({"mapa": ["wa<s>w"]})).ok)


func test_contrato_rechaza_filas_desiguales() -> void:
	assert_false(ContratoLaberinto.validar(_json({"mapa": ["wwww", "was"]})).ok)


func test_contrato_rechaza_mapas_sin_inicio_o_salida() -> void:
	assert_false(ContratoLaberinto.validar(_json({"mapa": ["wccw"]})).ok)


func test_contrato_rechaza_mapas_gigantes() -> void:
	var fila := "a" + "c".repeat(ConfigLaberinto.MAX_COLUMNAS) + "s"
	assert_false(ContratoLaberinto.validar(_json({"mapa": [fila]})).ok)


func test_contrato_acepta_avatares_conocidos_y_usa_el_predeterminado_si_no() -> void:
	assert_eq(ContratoLaberinto.validar(_json({"mapa": MAPA, "avatar": "chispa"})).avatar, "chispa")
	assert_eq(ContratoLaberinto.validar(_json({"mapa": MAPA, "avatar": "../../hack"})).avatar, "byte")
	assert_eq(ContratoLaberinto.validar(_json({"mapa": MAPA})).avatar, "byte")


# --- Arte: todas las texturas que usa el juego existen ---

func test_existen_las_texturas_de_cada_mundo() -> void:
	for tema: int in ConfigLaberinto.TEXTURAS_TEMA:
		for ruta: String in ConfigLaberinto.texturas_tema(tema).values():
			assert_true(ResourceLoader.exists(ConfigLaberinto.RUTA_SPRITES + ruta), "falta %s" % ruta)
	for ruta: String in [ConfigLaberinto.PUERTA_CERRADA, ConfigLaberinto.PUERTA_ABIERTA]:
		assert_true(ResourceLoader.exists(ConfigLaberinto.RUTA_SPRITES + ruta), "falta %s" % ruta)


func test_existen_todas_las_poses_de_cada_avatar() -> void:
	for avatar: String in ConfigLaberinto.AVATARES:
		for pose: String in ConfigLaberinto.POSES:
			var ruta := ConfigLaberinto.RUTA_SPRITES + ConfigLaberinto.ruta_personaje(avatar, pose)
			assert_true(ResourceLoader.exists(ruta), "falta %s" % ruta)


func test_contrato_ignora_resueltos_que_no_son_obstaculos() -> void:
	var r := ContratoLaberinto.validar(_json({"mapa": MAPA, "resueltos": ["w", 3, "2"]}))
	assert_eq(r.resueltos, ["2"] as Array[String])
