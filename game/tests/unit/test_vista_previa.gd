extends GutTest

const VistaPrevia := preload("res://scripts/laberinto/vista_previa.gd")


func test_lee_el_mapa_real_de_cada_mundo() -> void:
	for mundo in [1, 2, 3, 4]:
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
