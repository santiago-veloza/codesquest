extends GutTest
## Reglas de la arquitectura del juego (docs/adr/0006-arquitectura-en-capas.md):
##   web/        PuenteWeb y JsonSeguro: lo ÚNICO que habla con la página (JavaScriptBridge)
##   escena      escena_laberinto.gd orquesta; tablero, jugador, enemigo, minimapa... dibujan
##   lógica      laberinto, patrulla, vida, contrato_laberinto: RefCounted, sin nodos (se prueban solos)
##   config      config_laberinto.gd: única fuente de constantes

const RAIZ := "res://scripts"
const PUENTE := "res://scripts/web/puente_web.gd"
const LOGICA_PURA := [
	"res://scripts/laberinto/laberinto.gd",
	"res://scripts/laberinto/patrulla.gd",
	"res://scripts/laberinto/vida.gd",
	"res://scripts/laberinto/contrato_laberinto.gd",
	"res://scripts/laberinto/config_laberinto.gd",
	"res://scripts/web/json_seguro.gd",
]


func _scripts(carpeta: String) -> Array[String]:
	var encontrados: Array[String] = []
	for nombre in DirAccess.get_files_at(carpeta):
		if nombre.ends_with(".gd"):
			encontrados.append(carpeta.path_join(nombre))
	for sub in DirAccess.get_directories_at(carpeta):
		encontrados.append_array(_scripts(carpeta.path_join(sub)))
	return encontrados


func test_solo_el_puente_habla_con_javascript() -> void:
	var fuera_del_puente: Array[String] = []
	for ruta in _scripts(RAIZ):
		if ruta != PUENTE and FileAccess.get_file_as_string(ruta).contains("JavaScriptBridge"):
			fuera_del_puente.append(ruta)
	assert_eq(fuera_del_puente, [] as Array[String], "JavaScriptBridge solo se usa en puente_web.gd")


func test_la_logica_pura_no_depende_de_la_escena() -> void:
	for ruta: String in LOGICA_PURA:
		var codigo := FileAccess.get_file_as_string(ruta)
		assert_true(codigo.contains("extends RefCounted"), "%s debe ser RefCounted (sin nodos)" % ruta)
		for prohibido in ["get_node(", "get_tree(", "$", "JavaScriptBridge", "add_child("]:
			assert_false(codigo.contains(prohibido), "%s no debe usar %s" % [ruta, prohibido])
