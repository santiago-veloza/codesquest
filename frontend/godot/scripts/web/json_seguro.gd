## Lectura segura del JSON que llega desde la página web (entrada no confiable).
class_name JsonSeguro
extends RefCounted


## Devuelve el Dictionary si el texto es un objeto JSON, o null. No registra errores del motor.
static func parsear_objeto(texto_json: String) -> Variant:
	var json := JSON.new()
	if json.parse(texto_json) != OK or typeof(json.data) != TYPE_DICTIONARY:
		return null
	return json.data
