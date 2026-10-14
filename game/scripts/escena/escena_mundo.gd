## EscenaMundo: capas (fondo lejano -> fondo medio -> calle -> personajes -> HUD)
## y reproducción en orden de la ColaDeAcciones.
extends Node2D

const COLOR_HORIZONTE := Color("#1e1b4b")
const COLOR_EDIFICIO_LEJANO := Color("#312e81")
const COLOR_EDIFICIO_MEDIO := Color("#0e7490")
const COLOR_VENTANA := Color("#fde68a")
const COLOR_CALLE := Color("#0f172a")
const COLOR_NEON := Color("#f0abfc")
const LARGO_CALLE_PX := 20000.0
const GROSOR_NEON_PX := 4.0

var _reproduciendo := false

@onready var _puente: PuenteWeb = $PuenteWeb
@onready var _protagonista: Protagonista = $Protagonista
@onready var _estado: Label = $HUD/Estado
@onready var _fondo_lejano: Parallax2D = $FondoLejano
@onready var _fondo_medio: Parallax2D = $FondoMedio
@onready var _calle: Node2D = $Calle


func _ready() -> void:
	_protagonista.position = ConfigEscena.POSICION_INICIAL
	_construir_capas()
	_aplicar_movimiento_reducido(false)
	_puente.reproduccion_solicitada.connect(reproducir)
	_puente.configuracion_recibida.connect(_aplicar_movimiento_reducido)
	_estado.text = "Listo. (En el editor: Enter reproduce una demo)"


func _unhandled_input(evento: InputEvent) -> void:
	if not OS.has_feature("web") and evento.is_action_pressed("ui_accept"):
		reproducir(ConfigEscena.ACCIONES_DEMO)


func reproducir(acciones: Array[String]) -> void:
	if _reproduciendo:
		_puente.notificar("error", {"mensaje": "La escena ya está reproduciendo acciones."})
		return
	_reproduciendo = true
	for i in acciones.size():
		_estado.text = "Acción %d/%d: %s" % [i + 1, acciones.size(), acciones[i]]
		await _protagonista.ejecutar(acciones[i])
	_reproduciendo = false
	_estado.text = "Terminado (%d acciones)" % acciones.size()
	_puente.notificar("acciones_terminadas", {
		"total": acciones.size(),
		"posicion_x": _protagonista.position.x,
	})


## Con "reducir movimiento" las capas de fondo no hacen parallax y las acciones son casi instantáneas.
func _aplicar_movimiento_reducido(activo: bool) -> void:
	_protagonista.movimiento_reducido = activo
	_fondo_lejano.scroll_scale = Vector2.ONE * (1.0 if activo else ConfigEscena.ESCALA_FONDO_LEJANO)
	_fondo_medio.scroll_scale = Vector2.ONE * (1.0 if activo else ConfigEscena.ESCALA_FONDO_MEDIO)


## Placeholders geométricos hasta tener el arte final.
func _construir_capas() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = ConfigEscena.SEMILLA_EDIFICIOS
	var ancho := ConfigEscena.ANCHO_REPETICION_PX
	var alto: float = get_viewport_rect().size.y
	var suelo := ConfigEscena.POSICION_INICIAL.y

	_agregar_rect(_fondo_lejano, Rect2(0, 0, ancho, alto), COLOR_HORIZONTE)
	_agregar_edificios(_fondo_lejano, rng, 10, Vector2(60, 140), Vector2(120, 320), COLOR_EDIFICIO_LEJANO, false)
	_agregar_edificios(_fondo_medio, rng, 6, Vector2(100, 200), Vector2(200, 420), COLOR_EDIFICIO_MEDIO, true)
	_fondo_lejano.repeat_size = Vector2(ancho, 0)
	_fondo_medio.repeat_size = Vector2(ancho, 0)

	_agregar_rect(_calle, Rect2(-ancho, suelo, LARGO_CALLE_PX, alto - suelo), COLOR_CALLE)
	_agregar_rect(_calle, Rect2(-ancho, suelo, LARGO_CALLE_PX, GROSOR_NEON_PX), COLOR_NEON)


func _agregar_edificios(capa: Node, rng: RandomNumberGenerator, cantidad: int,
		rango_ancho: Vector2, rango_alto: Vector2, color: Color, con_ventanas: bool) -> void:
	var suelo := ConfigEscena.POSICION_INICIAL.y
	var separacion := ConfigEscena.ANCHO_REPETICION_PX / cantidad
	for i in cantidad:
		var tam := Vector2(rng.randf_range(rango_ancho.x, rango_ancho.y), rng.randf_range(rango_alto.x, rango_alto.y))
		var rect := Rect2(i * separacion, suelo - tam.y, tam.x, tam.y)
		_agregar_rect(capa, rect, color)
		if con_ventanas:
			_agregar_rect(capa, Rect2(rect.position + Vector2(16, 24), Vector2(12, 12)), COLOR_VENTANA)


func _agregar_rect(padre: Node, rect: Rect2, color: Color) -> void:
	var r := ColorRect.new()
	r.position = rect.position
	r.size = rect.size
	r.color = color
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	padre.add_child(r)
