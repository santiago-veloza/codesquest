## Valida la ColaDeAcciones que envía React. Todo lo que llega de JavaScript es entrada no confiable.
## Formato: {"version": 1, "acciones": [{"tipo": "avanzar"}, ...]}
class_name ContratoAcciones
extends RefCounted


## Devuelve {"ok": bool, "acciones": Array[String], "error": String}.
static func validar(texto_json: String) -> Dictionary:
	var datos: Variant = parsear_objeto(texto_json)
	if datos == null:
		return _fallo("El mensaje no es un objeto JSON válido.")

	var version: Variant = datos.get("version")
	if typeof(version) not in [TYPE_INT, TYPE_FLOAT] or int(version) != ConfigEscena.VERSION_CONTRATO:
		return _fallo("Versión de contrato no soportada.")

	var lista: Variant = datos.get("acciones")
	if typeof(lista) != TYPE_ARRAY:
		return _fallo("Falta la lista de acciones.")
	if lista.size() > ConfigEscena.MAX_ACCIONES:
		return _fallo("Demasiadas acciones (máximo %d)." % ConfigEscena.MAX_ACCIONES)

	var acciones: Array[String] = []
	for elemento: Variant in lista:
		var tipo: Variant = elemento.get("tipo") if typeof(elemento) == TYPE_DICTIONARY else null
		if typeof(tipo) != TYPE_STRING or tipo not in ConfigEscena.ACCIONES_VALIDAS:
			return _fallo("Acción desconocida: %s" % str(tipo))
		acciones.append(tipo)

	return {"ok": true, "acciones": acciones, "error": ""}


## Devuelve el Dictionary si el texto es un objeto JSON, o null. No registra errores del motor.
static func parsear_objeto(texto_json: String) -> Variant:
	var json := JSON.new()
	if json.parse(texto_json) != OK or typeof(json.data) != TYPE_DICTIONARY:
		return null
	return json.data


static func _fallo(mensaje: String) -> Dictionary:
	return {"ok": false, "acciones": [] as Array[String], "error": mensaje}
