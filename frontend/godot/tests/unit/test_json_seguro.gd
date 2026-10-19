extends GutTest

const JsonSeguro := preload("res://scripts/web/json_seguro.gd")


func test_un_objeto_json_se_lee() -> void:
	# Godot lee los números de un JSON como float.
	assert_eq(JsonSeguro.parsear_objeto('{"tema": 2}'), {"tema": 2.0})


func test_json_invalido_devuelve_null() -> void:
	assert_null(JsonSeguro.parsear_objeto("{no es json"))


func test_json_que_no_es_objeto_devuelve_null() -> void:
	assert_null(JsonSeguro.parsear_objeto("[1, 2, 3]"))
	assert_null(JsonSeguro.parsear_objeto('"texto"'))


func test_texto_vacio_devuelve_null() -> void:
	assert_null(JsonSeguro.parsear_objeto(""))
