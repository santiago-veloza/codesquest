extends GutTest

const VistaPrevia := preload("res://scripts/laberinto/vista_previa.gd")


func test_lee_el_mapa_real_de_cada_mundo() -> void:
	for mundo in [1, 2, 3, 4, 5]:
		var datos: Dictionary = VistaPrevia.leer_mundo(mundo)
		assert_eq(datos.tema, mundo)
		assert_ne(datos.mapa, PackedStringArray(ConfigLaberinto.MAPA_DEMO), "el mundo %d debe tener su propio mapa" % mundo)
		assert_true("".join(datos.mapa).contains("a"), "el mapa del mundo %d tiene punto de partida" % mundo)


func test_mundo_cero_es_la_demostracion() -> void:
	assert_eq(VistaPrevia.leer_mundo(0).mapa, PackedStringArray(ConfigLaberinto.MAPA_DEMO))


func test_un_mundo_sin_archivo_muestra_la_demostracion() -> void:
	assert_eq(VistaPrevia.leer_mundo(99).mapa, PackedStringArray(ConfigLaberinto.MAPA_DEMO))


func test_al_jugar_la_vista_previa_se_elimina() -> void:
	var vista := VistaPrevia.new()
	add_child(vista)
	await get_tree().process_frame
	assert_false(is_instance_valid(vista), "fuera del editor la vista previa no debe existir")


func test_cada_tema_tiene_todas_sus_imagenes() -> void:
	for tema in [1, 2, 3, 4, 5]:
		var arte: Dictionary = ConfigLaberinto.texturas_tema(tema)
		var rutas := [arte.pared, arte.candado]
		for pose: String in ConfigLaberinto.poses_enemigo(tema):
			rutas.append(ConfigLaberinto.ruta_enemigo(tema, pose))
		rutas.append(ConfigLaberinto.ruta_enemigo(tema, ConfigLaberinto.enemigo_tema(tema).derrotado))
		for ruta: String in rutas:
			assert_not_null(ConfigLaberinto.textura(ruta), "tema %d: falta %s" % [tema, ruta])


func test_la_vista_previa_crea_un_sprite_con_imagen_por_cada_casilla_dibujada() -> void:
	var vista := VistaPrevia.new() # sin agregarla al árbol: fuera del editor se borraría sola
	var datos: Dictionary = VistaPrevia.leer_mundo(1)
	vista._mapa = datos.mapa
	vista._tema = datos.tema
	vista._reconstruir()
	var con_imagen := 0
	for hijo in vista.get_children():
		if hijo is Sprite2D:
			assert_not_null(hijo.texture, "cada sprite tiene su imagen")
			con_imagen += 1
	var esperadas := 0
	for fila: String in datos.mapa:
		for simbolo in fila:
			if simbolo in ["w", "s", "a", "e"] or simbolo.is_valid_int():
				esperadas += 1
	assert_eq(con_imagen, esperadas)
	assert_eq(vista._candados.size(), 3, "los 3 candados con su número")
	vista.free()
