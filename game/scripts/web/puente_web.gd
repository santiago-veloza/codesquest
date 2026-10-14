## Comunicación Godot <-> React mediante JavaScriptBridge (solo en la exportación web).
## Godot publica window.codequestGodot con:
##   cargarLaberinto(json), resolverObstaculo(simbolo), pausar(), reanudar(), configurar(json), reproducir(json)
## y avisa a React llamando window.codequestHost.recibirEvento(nombre, json).
## Solo viajan cadenas JSON o símbolos validados; nunca se usa eval.
class_name PuenteWeb
extends Node

signal reproduccion_solicitada(acciones: Array[String])
signal configuracion_recibida(movimiento_reducido: bool)
signal audio_configurado(volumen: float, silencio: bool)
signal laberinto_recibido(datos: Dictionary)
signal obstaculo_resuelto(simbolo: String)
signal pausado
signal reanudado

const OBJETO_GODOT := "codequestGodot"
const OBJETO_HOST := "codequestHost"

# Las referencias a los callbacks deben conservarse o JavaScript no podrá llamarlos.
var _callbacks := {}


func _ready() -> void:
	if not OS.has_feature("web"):
		return
	var api = JavaScriptBridge.create_object("Object")
	for nombre: String in ["reproducir", "configurar", "cargarLaberinto", "resolverObstaculo", "pausar", "reanudar"]:
		_callbacks[nombre] = JavaScriptBridge.create_callback(Callable(self, "_al_" + nombre.to_snake_case()))
		api[nombre] = _callbacks[nombre]
	JavaScriptBridge.get_interface("window")[OBJETO_GODOT] = api
	# Diferido: Godot ejecuta _ready() de los hijos antes que el del padre. Si se avisa ya, React
	# responde con el laberinto antes de que la escena (padre) conecte sus señales y se pierde.
	notificar.call_deferred("escena_lista", {})


func notificar(evento: String, datos: Dictionary) -> void:
	if not OS.has_feature("web"):
		print("[puente] %s %s" % [evento, JSON.stringify(datos)])
		return
	var host = JavaScriptBridge.get_interface("window")[OBJETO_HOST]
	if host == null:
		return
	host.recibirEvento(evento, JSON.stringify(datos))


func _al_reproducir(args: Array) -> void:
	var texto := _primer_texto(args)
	if texto.is_empty():
		notificar("error", {"mensaje": "Se esperaba un texto JSON."})
		return
	var resultado := ContratoAcciones.validar(texto)
	if not resultado.ok:
		notificar("error", {"mensaje": resultado.error})
		return
	reproduccion_solicitada.emit(resultado.acciones)


func _al_configurar(args: Array) -> void:
	var datos: Variant = ContratoAcciones.parsear_objeto(_primer_texto(args))
	if datos == null:
		return
	if datos.has("movimiento_reducido"):
		configuracion_recibida.emit(datos.movimiento_reducido == true)
	var volumen: Variant = datos.get("volumen")
	if typeof(volumen) in [TYPE_INT, TYPE_FLOAT]:
		audio_configurado.emit(clampf(float(volumen), 0.0, 1.0), datos.get("silencio", false) == true)


func _al_cargar_laberinto(args: Array) -> void:
	var resultado := ContratoLaberinto.validar(_primer_texto(args))
	if not resultado.ok:
		notificar("error", {"mensaje": resultado.error})
		return
	laberinto_recibido.emit(resultado)


func _al_resolver_obstaculo(args: Array) -> void:
	var simbolo := _primer_texto(args)
	if Laberinto.es_obstaculo(simbolo):
		obstaculo_resuelto.emit(simbolo)


func _al_pausar(_args: Array) -> void:
	pausado.emit()


func _al_reanudar(_args: Array) -> void:
	reanudado.emit()


func _primer_texto(args: Array) -> String:
	if args.is_empty() or typeof(args[0]) != TYPE_STRING:
		return ""
	return args[0]
