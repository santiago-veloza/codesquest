## Personaje del laberinto con animaciones: quieto, caminar (2 cuadros), golpe contra pared y salto.
## Se mueve casilla por casilla; mira a la izquierda volteando el sprite.
class_name JugadorLaberinto
extends Node2D

const ANIM_QUIETO := "quieto"
const ANIM_CAMINAR := "caminar"
const ANIM_GOLPE := "golpe"
const ANIM_SALTO := "salto"

var celda := Vector2i.ZERO
var mirando := Vector2i.RIGHT
var moviendose := false
var movimiento_reducido := false
var _sprite: AnimatedSprite2D


func _ready() -> void:
	_sprite = AnimatedSprite2D.new()
	_sprite.scale = Vector2.ONE * ConfigLaberinto.ESCALA_PERSONAJE
	add_child(_sprite)
	configurar_avatar(ConfigLaberinto.AVATAR_POR_DEFECTO)


func configurar_avatar(avatar: String) -> void:
	var cuadros := SpriteFrames.new()
	var animaciones := {
		ANIM_QUIETO: ["front"],
		ANIM_CAMINAR: ["walk_a", "walk_b"],
		ANIM_GOLPE: ["hit"],
		ANIM_SALTO: ["jump"],
	}
	for nombre: String in animaciones:
		cuadros.add_animation(nombre)
		cuadros.set_animation_speed(nombre, ConfigLaberinto.FPS_CAMINAR)
		cuadros.set_animation_loop(nombre, nombre == ANIM_CAMINAR)
		for pose: String in animaciones[nombre]:
			cuadros.add_frame(nombre, ConfigLaberinto.textura(ConfigLaberinto.ruta_personaje(avatar, pose)))
	cuadros.remove_animation("default")
	_sprite.sprite_frames = cuadros
	_sprite.play(ANIM_QUIETO)


func colocar(nueva: Vector2i) -> void:
	celda = nueva
	position = ConfigLaberinto.centro_de(celda)


func mirar(direccion: Vector2i) -> void:
	mirando = direccion
	if direccion.x != 0:
		_sprite.flip_h = direccion.x < 0


func avanzar_a(destino: Vector2i) -> void:
	moviendose = true
	celda = destino
	var duracion := ConfigLaberinto.DURACION_PASO_REDUCIDA_S if movimiento_reducido else ConfigLaberinto.DURACION_PASO_S
	if duracion <= 0.0:
		position = ConfigLaberinto.centro_de(destino)
	else:
		if _sprite.animation != ANIM_CAMINAR:
			_sprite.play(ANIM_CAMINAR)
		var tween := create_tween()
		tween.tween_property(self, "position", ConfigLaberinto.centro_de(destino), duracion)
		await tween.finished
	moviendose = false


## Vuelve a la pose quieta cuando se suelta la tecla.
func detener() -> void:
	if _sprite.animation == ANIM_CAMINAR:
		_sprite.play(ANIM_QUIETO)


## Reacción breve al chocar con una pared o una salida cerrada.
func golpear() -> void:
	_sprite.play(ANIM_GOLPE)
	await get_tree().create_timer(ConfigLaberinto.DURACION_GOLPE_S).timeout
	if _sprite.animation == ANIM_GOLPE:
		_sprite.play(ANIM_QUIETO)


func celebrar() -> void:
	_sprite.play(ANIM_SALTO)
