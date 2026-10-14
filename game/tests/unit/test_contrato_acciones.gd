extends GutTest


func _json(acciones: Array, version: Variant = ConfigEscena.VERSION_CONTRATO) -> String:
	return JSON.stringify({"version": version, "acciones": acciones})


func _cola_de(cantidad: int) -> Array:
	var cola := []
	for i in cantidad:
		cola.append({"tipo": "esperar"})
	return cola


func test_cola_valida_se_acepta_en_orden() -> void:
	var r := ContratoAcciones.validar(_json([{"tipo": "avanzar"}, {"tipo": "saltar"}]))
	assert_true(r.ok)
	assert_eq(r.acciones, ["avanzar", "saltar"] as Array[String])


func test_cola_vacia_es_valida() -> void:
	assert_true(ContratoAcciones.validar(_json([])).ok)


func test_json_invalido_se_rechaza() -> void:
	assert_false(ContratoAcciones.validar("{no es json").ok)


func test_json_que_no_es_objeto_se_rechaza() -> void:
	assert_false(ContratoAcciones.validar("[1, 2]").ok)


func test_version_distinta_se_rechaza() -> void:
	assert_false(ContratoAcciones.validar(_json([], 99)).ok)


func test_version_como_texto_se_rechaza() -> void:
	assert_false(ContratoAcciones.validar(_json([], "1")).ok)


func test_accion_desconocida_se_rechaza() -> void:
	var r := ContratoAcciones.validar(_json([{"tipo": "borrar_disco"}]))
	assert_false(r.ok)
	assert_string_contains(r.error, "borrar_disco")


func test_elemento_sin_tipo_se_rechaza() -> void:
	assert_false(ContratoAcciones.validar(_json([{"accion": "avanzar"}])).ok)


func test_elemento_que_no_es_objeto_se_rechaza() -> void:
	assert_false(ContratoAcciones.validar(_json(["avanzar"])).ok)


func test_exceso_de_acciones_se_rechaza() -> void:
	assert_false(ContratoAcciones.validar(_json(_cola_de(ConfigEscena.MAX_ACCIONES + 1))).ok)


func test_limite_exacto_de_acciones_se_acepta() -> void:
	assert_true(ContratoAcciones.validar(_json(_cola_de(ConfigEscena.MAX_ACCIONES))).ok)
