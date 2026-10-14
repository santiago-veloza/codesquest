## Valida el laberinto que envía la página: {"mapa": [...], "resueltos": ["1"], "tema": 1}.
## Todo lo que llega de JavaScript es entrada no confiable: se comprueba tamaño y símbolos.
class_name ContratoLaberinto
extends RefCounted


static func validar(texto_json: String) -> Dictionary:
	var datos: Variant = ContratoAcciones.parsear_objeto(texto_json)
	if datos == null:
		return _fallo("El mensaje no es un objeto JSON válido.")

	var mapa: Variant = datos.get("mapa")
	if typeof(mapa) != TYPE_ARRAY or mapa.is_empty() or mapa.size() > ConfigLaberinto.MAX_FILAS:
		return _fallo("El mapa debe ser una lista de filas (máximo %d)." % ConfigLaberinto.MAX_FILAS)
	var filas := PackedStringArray()
	for fila: Variant in mapa:
		if typeof(fila) != TYPE_STRING or fila.is_empty() or fila.length() > ConfigLaberinto.MAX_COLUMNAS:
			return _fallo("Cada fila del mapa debe ser un texto de hasta %d casillas." % ConfigLaberinto.MAX_COLUMNAS)
		if fila.length() != mapa[0].length():
			return _fallo("Todas las filas del mapa deben tener el mismo largo.")
		for caracter in fila:
			if not ConfigLaberinto.SIMBOLOS_VALIDOS.contains(caracter):
				return _fallo("Símbolo no permitido en el mapa: %s" % caracter)
		filas.append(fila)

	var laberinto := Laberinto.new(filas)
	if laberinto.buscar(Laberinto.INICIO) == Vector2i(-1, -1) or laberinto.buscar(Laberinto.SALIDA) == Vector2i(-1, -1):
		return _fallo("El mapa necesita un inicio (a) y una salida (s).")

	var resueltos: Array[String] = []
	var lista: Variant = datos.get("resueltos", [])
	if typeof(lista) != TYPE_ARRAY:
		return _fallo("'resueltos' debe ser una lista.")
	for simbolo: Variant in lista:
		if typeof(simbolo) == TYPE_STRING and Laberinto.es_obstaculo(simbolo):
			resueltos.append(simbolo)

	var tema: Variant = datos.get("tema", ConfigLaberinto.TEMA_POR_DEFECTO)
	var tema_valido := int(tema) if typeof(tema) in [TYPE_INT, TYPE_FLOAT] else ConfigLaberinto.TEMA_POR_DEFECTO
	var avatar: Variant = datos.get("avatar", ConfigLaberinto.AVATAR_POR_DEFECTO)
	if typeof(avatar) != TYPE_STRING or not ConfigLaberinto.AVATARES.has(avatar):
		avatar = ConfigLaberinto.AVATAR_POR_DEFECTO
	return {"ok": true, "mapa": filas, "resueltos": resueltos, "tema": tema_valido, "avatar": avatar, "error": ""}


static func _fallo(mensaje: String) -> Dictionary:
	return {"ok": false, "error": mensaje}
