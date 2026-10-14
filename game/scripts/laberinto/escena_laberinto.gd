## Escena del laberinto: el jugador se mueve con flechas/WASD y dispara con Espacio; la cámara lo sigue
## y el minimapa muestra el recorrido. Los enemigos patrullan y, si alcanzan al jugador, lo empujan
## una casilla y le quitan el 10 % de la vida; sin vida es game over (React ofrece reiniciar). Al chocar con un obstáculo avisa a React (que abre el desafío) y se
## pausa hasta que se resuelva. La salida solo se abre con todos los obstáculos resueltos.
extends Node2D

## Solo en el editor (F5/F6): qué laberinto mostrar. 0 = demostración pequeña; 1-4 = el mapa real
## del mundo, leído de content/mundos/mundo_N.json. En la web el mapa siempre lo envía React.
@export_range(0, 4) var mundo_en_editor := 1
## Solo en el editor: personaje a mostrar (byte, pixel o chispa).
@export_enum("byte", "pixel", "chispa") var avatar_en_editor := "byte"

const REINTENTO_REAPARICION_S := 1.0
# preload (y no el class_name): funciona aunque el editor aún no haya registrado la clase.
const VistaPrevia := preload("res://scripts/laberinto/vista_previa.gd")

var _laberinto: Laberinto
var _paleta: Dictionary
var _tema := ConfigLaberinto.TEMA_POR_DEFECTO
var _pausado := true
var _movimiento_reducido := false
var _obstaculos := {} # simbolo -> ObstaculoLaberinto
var _enemigos: Array[EnemigoLaberinto] = []
var _rng := RandomNumberGenerator.new()
var _ultimo_disparo_ms := -100000
var _ultimo_aviso := Vector2i(-1, -1) # evita repetir avisos mientras se mantiene la tecla
var _reloj_enemigos: Timer
var _sonidos: SonidosLaberinto
var _vida := VidaJugador.new()
var _barra_vida: BarraVida

@onready var _puente: PuenteWeb = $PuenteWeb
@onready var _tablero: TableroLaberinto = $Tablero
@onready var _capa_obstaculos: Node2D = $Obstaculos
@onready var _capa_enemigos: Node2D = $Enemigos
@onready var _jugador: JugadorLaberinto = $Jugador
@onready var _camara: Camera2D = $Jugador/Camara
@onready var _minimapa: Minimapa = $HUD/Minimapa
@onready var _estado: Label = $HUD/Estado


func _ready() -> void:
	ControlesLaberinto.registrar()
	_camara.zoom = ConfigLaberinto.ZOOM_CAMARA
	_dar_fondo_al_estado()
	_sonidos = SonidosLaberinto.new()
	add_child(_sonidos)
	_barra_vida = BarraVida.new()
	$HUD.add_child(_barra_vida)
	_reloj_enemigos = Timer.new()
	_reloj_enemigos.timeout.connect(_mover_enemigos)
	add_child(_reloj_enemigos)
	_puente.laberinto_recibido.connect(_cargar)
	_puente.obstaculo_resuelto.connect(_resolver_obstaculo)
	_puente.reanudado.connect(_reanudar)
	# La página abre un desafío desde la lista de obstáculos: los enemigos se detienen mientras tanto.
	_puente.pausado.connect(func() -> void: _pausado = true)
	_puente.configuracion_recibida.connect(_aplicar_movimiento_reducido)
	_puente.audio_configurado.connect(_sonidos.configurar)
	if not OS.has_feature("web"):
		# En el editor: el mundo elegido en el Inspector. Enter "resuelve" el obstáculo que bloquea.
		_cargar(_laberinto_del_editor())


func _dar_fondo_al_estado() -> void:
	var fondo := StyleBoxFlat.new()
	fondo.bg_color = ConfigLaberinto.HUD_FONDO
	fondo.set_content_margin_all(ConfigLaberinto.HUD_RELLENO)
	fondo.set_corner_radius_all(ConfigLaberinto.HUD_RELLENO)
	_estado.add_theme_stylebox_override("normal", fondo)
	_estado.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	_estado.offset_right = _estado.offset_left # el ancho se ajusta al texto


func _laberinto_del_editor() -> Dictionary:
	var datos: Dictionary = VistaPrevia.leer_mundo(mundo_en_editor)
	return {"mapa": datos.mapa, "resueltos": [], "tema": datos.tema, "avatar": avatar_en_editor}


func _cargar(datos: Dictionary) -> void:
	_laberinto = Laberinto.new(datos.mapa, datos.resueltos)
	_tema = datos.tema
	_paleta = ConfigLaberinto.paleta(_tema)
	_rng.seed = ConfigLaberinto.SEMILLA_PATRULLA
	RenderingServer.set_default_clear_color(_paleta.fondo)
	_tablero.construir(_laberinto, _paleta, _tema)
	_crear_obstaculos()
	_crear_enemigos()
	_jugador.configurar_avatar(datos.get("avatar", ConfigLaberinto.AVATAR_POR_DEFECTO))
	_jugador.colocar(_laberinto.inicio())
	_vida.reiniciar()
	_barra_vida.mostrar(_vida)
	_configurar_camara()
	_minimapa.configurar(_laberinto, _paleta, _jugador, _enemigos)
	_actualizar_estado()
	_pausado = false
	_reloj_enemigos.start(ConfigLaberinto.enemigo_tema(_tema).paso_s)
	_puente.notificar("laberinto_listo", {"pendientes": _laberinto.pendientes(), "enemigos": _enemigos.size(), "vida": _vida.porcentaje()})


func _crear_obstaculos() -> void:
	for hijo in _capa_obstaculos.get_children():
		hijo.queue_free()
	_obstaculos.clear()
	var posiciones := _laberinto.obstaculos()
	for simbolo: String in posiciones:
		if _laberinto.esta_resuelto(simbolo):
			continue
		var obstaculo := ObstaculoLaberinto.new()
		_capa_obstaculos.add_child(obstaculo)
		obstaculo.configurar(simbolo, posiciones[simbolo], _paleta.obstaculo, _tema, _movimiento_reducido)
		_obstaculos[simbolo] = obstaculo


func _crear_enemigos() -> void:
	for hijo in _capa_enemigos.get_children():
		hijo.queue_free()
	_enemigos.clear()
	for celda in _laberinto.enemigos():
		var enemigo := EnemigoLaberinto.new()
		_capa_enemigos.add_child(enemigo)
		enemigo.configurar(celda, _tema)
		_enemigos.append(enemigo)


func _configurar_camara() -> void:
	var tam := ConfigLaberinto.TAM_CELDA
	_camara.limit_left = 0
	_camara.limit_top = 0
	_camara.limit_right = _laberinto.ancho() * tam
	_camara.limit_bottom = _laberinto.alto() * tam
	_camara.position_smoothing_enabled = not _movimiento_reducido
	_camara.reset_smoothing()


func _process(_delta: float) -> void:
	if _pausado or _laberinto == null:
		return
	if Input.is_action_just_pressed(ControlesLaberinto.DISPARAR):
		_disparar()
	if _jugador.moviendose:
		return
	var direccion := ControlesLaberinto.direccion_pulsada()
	if direccion == Vector2i.ZERO:
		_ultimo_aviso = Vector2i(-1, -1)
		_jugador.detener()
		return
	_intentar_mover(direccion)


func _unhandled_input(evento: InputEvent) -> void:
	# Solo en el editor: Enter resuelve el obstáculo que bloquea o reinicia tras un game over.
	if OS.has_feature("web") or not _pausado or not evento is InputEventKey:
		return
	if evento.pressed and evento.physical_keycode in [KEY_ENTER, KEY_KP_ENTER]:
		if not _vida.esta_vivo():
			_cargar(_laberinto_del_editor()) # game over en el editor: Enter vuelve a empezar
			return
		_resolver_obstaculo(_laberinto.simbolo(_jugador.celda + _jugador.mirando))


func _enemigo_en(celda: Vector2i) -> EnemigoLaberinto:
	for enemigo in _enemigos:
		if enemigo.vivo and enemigo.celda == celda:
			return enemigo
	return null


func _intentar_mover(direccion: Vector2i) -> void:
	_jugador.mirar(direccion)
	var destino := _jugador.celda + direccion
	match _laberinto.evaluar_paso(destino):
		Laberinto.Paso.LIBRE:
			if _enemigo_en(destino):
				_avisar_una_vez(destino, "¡Un enemigo bloquea el paso! Dispárale con Espacio.")
				return
			await _jugador.avanzar_a(destino)
			_minimapa.queue_redraw()
		Laberinto.Paso.OBSTACULO:
			_pausado = true
			_sonidos.reproducir("obstaculo")
			var simbolo := _laberinto.simbolo(destino)
			_estado.text = "Obstáculo %s: resuelve el desafío para pasar." % simbolo
			_puente.notificar("obstaculo", {"simbolo": simbolo})
		Laberinto.Paso.SALIDA_CERRADA:
			if _avisar_una_vez(destino, "La salida está cerrada: faltan %d obstáculos." % _laberinto.pendientes()):
				_puente.notificar("salida_cerrada", {"pendientes": _laberinto.pendientes()})
		Laberinto.Paso.SALIDA_ABIERTA:
			await _jugador.avanzar_a(destino)
			_minimapa.queue_redraw()
			_pausado = true
			_reloj_enemigos.stop()
			_sonidos.reproducir("salida")
			_jugador.celebrar()
			_estado.text = "¡Saliste del laberinto!"
			_puente.notificar("salida", {})
		Laberinto.Paso.PARED:
			_avisar_una_vez(destino, "")


## Golpe + mensaje la primera vez que se empuja contra algo (no se repite mientras se mantiene la tecla).
func _avisar_una_vez(destino: Vector2i, mensaje: String) -> bool:
	if _ultimo_aviso == destino:
		return false
	_ultimo_aviso = destino
	_jugador.golpear()
	_sonidos.reproducir("choque")
	if mensaje:
		_estado.text = mensaje
	return true


# --- Enemigos ---


func _mover_enemigos() -> void:
	if _pausado:
		return
	var ocupadas := {}
	for enemigo in _enemigos:
		if enemigo.vivo:
			ocupadas[enemigo.celda] = true
	var duracion: float = ConfigLaberinto.enemigo_tema(_tema).paso_s * 0.9
	for enemigo in _enemigos:
		if not enemigo.vivo:
			continue
		ocupadas.erase(enemigo.celda)
		var direccion := Patrulla.siguiente_direccion(_laberinto, enemigo.celda, enemigo.direccion, ocupadas, _rng)
		if direccion != Vector2i.ZERO:
			enemigo.direccion = direccion
			var destino := enemigo.celda + direccion
			if destino == _jugador.celda:
				_empujar_jugador(direccion)
			else:
				enemigo.mover_a(destino, duracion)
		ocupadas[enemigo.celda] = true
	_minimapa.queue_redraw()


## Un enemigo alcanzó al jugador: le quita vida y lo empuja una casilla en su dirección (si hay espacio).
func _empujar_jugador(direccion: Vector2i) -> void:
	if not _vida.recibir_golpe(Time.get_ticks_msec()):
		return # invulnerable justo después de otro golpe
	_jugador.golpear()
	_sonidos.reproducir("golpe")
	_barra_vida.mostrar(_vida)
	if not _vida.esta_vivo():
		_game_over()
		return
	_estado.text = "¡Un enemigo te golpeó! Vida: %d %%. Dispárale con Espacio." % _vida.porcentaje()
	_puente.notificar("golpe", {"vida": _vida.porcentaje()})
	var destino := _jugador.celda + direccion
	if not _jugador.moviendose and _laberinto.evaluar_paso(destino) == Laberinto.Paso.LIBRE and not _enemigo_en(destino):
		await _jugador.avanzar_a(destino)
		_minimapa.queue_redraw()


## Sin vida: el juego se detiene y React muestra "Game over" con la opción de reiniciar el laberinto.
func _game_over() -> void:
	_pausado = true
	_reloj_enemigos.stop()
	_jugador.detener()
	_estado.text = "¡Game over! Te quedaste sin vida."
	_puente.notificar("game_over", {})


func _disparar() -> void:
	var ahora := Time.get_ticks_msec()
	if ahora - _ultimo_disparo_ms < ConfigLaberinto.ESPERA_DISPARO_S * 1000:
		return
	_ultimo_disparo_ms = ahora
	_sonidos.reproducir("disparo")
	var proyectil := Sprite2D.new()
	proyectil.texture = ConfigLaberinto.textura(ConfigLaberinto.PROYECTIL)
	proyectil.scale = Vector2.ONE * (ConfigLaberinto.TAM_PROYECTIL / proyectil.texture.get_width())
	proyectil.position = _jugador.position
	add_child(proyectil)
	for celda in Patrulla.trayectoria(_laberinto, _jugador.celda, _jugador.mirando):
		var tween := create_tween().set_parallel()
		tween.tween_property(proyectil, "position", ConfigLaberinto.centro_de(celda), ConfigLaberinto.DURACION_PROYECTIL_CELDA_S)
		tween.tween_property(proyectil, "rotation", proyectil.rotation + PI / 2, ConfigLaberinto.DURACION_PROYECTIL_CELDA_S)
		await tween.finished
		var enemigo := _enemigo_en(celda)
		if enemigo:
			_derrotar(enemigo)
			break
	proyectil.queue_free()


func _derrotar(enemigo: EnemigoLaberinto) -> void:
	_puente.notificar("enemigo_derrotado", {})
	_sonidos.reproducir("enemigo_derrotado")
	await enemigo.derrotar()
	_minimapa.queue_redraw()
	await get_tree().create_timer(ConfigLaberinto.REAPARICION_ENEMIGO_S).timeout
	# Reaparece en su punto de partida cuando esté libre (nunca encima del jugador). Si mientras tanto
	# se reinició el laberinto, este enemigo ya no existe.
	while is_instance_valid(enemigo) and (_jugador.celda == enemigo.origen or _enemigo_en(enemigo.origen)):
		await get_tree().create_timer(REINTENTO_REAPARICION_S).timeout
	if not is_instance_valid(enemigo):
		return
	enemigo.reaparecer()
	_minimapa.queue_redraw()


# --- Obstáculos ---


func _resolver_obstaculo(simbolo: String) -> void:
	if not Laberinto.es_obstaculo(simbolo) or _laberinto == null or _laberinto.esta_resuelto(simbolo):
		_reanudar()
		return
	_laberinto.resolver(simbolo)
	_tablero.actualizar()
	_minimapa.queue_redraw()
	_actualizar_estado()
	var obstaculo: ObstaculoLaberinto = _obstaculos.get(simbolo)
	_obstaculos.erase(simbolo)
	_sonidos.reproducir("candado_abierto")
	if obstaculo:
		await obstaculo.desaparecer(_movimiento_reducido)
	_reanudar()


func _reanudar() -> void:
	if _vida.esta_vivo(): # tras un game over solo se sale reiniciando
		_pausado = false


func _actualizar_estado() -> void:
	var pendientes := _laberinto.pendientes()
	_estado.text = (
		"¡Todos los obstáculos superados! Busca la salida." if pendientes == 0
		else "Obstáculos por superar: %d · Espacio: disparar" % pendientes
	)


func _aplicar_movimiento_reducido(activo: bool) -> void:
	_movimiento_reducido = activo
	_jugador.movimiento_reducido = activo
	_camara.position_smoothing_enabled = not activo
