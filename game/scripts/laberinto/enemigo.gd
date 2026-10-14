## Enemigo que patrulla el laberinto. Se derrota con un disparo y reaparece al rato en su punto inicial.
class_name EnemigoLaberinto
extends Node2D

const ANIM_CAMINAR := "caminar"
const ANIM_DERROTADO := "derrotado"
const FPS := 6.0
const DURACION_DERROTA_S := 0.4

var celda := Vector2i.ZERO
var origen := Vector2i.ZERO
var direccion := Vector2i.RIGHT
var vivo := true
var _sprite: AnimatedSprite2D


func configurar(celda_inicial: Vector2i, tema: int) -> void:
	origen = celda_inicial
	celda = celda_inicial
	position = ConfigLaberinto.centro_de(celda)
	_sprite = AnimatedSprite2D.new()
	add_child(_sprite)
	var cuadros := SpriteFrames.new()
	cuadros.add_animation(ANIM_CAMINAR)
	cuadros.set_animation_speed(ANIM_CAMINAR, FPS)
	for pose in ["walk_a", "walk_b"]:
		cuadros.add_frame(ANIM_CAMINAR, ConfigLaberinto.textura(ConfigLaberinto.ruta_enemigo(tema, pose)))
	cuadros.add_animation(ANIM_DERROTADO)
	cuadros.add_frame(ANIM_DERROTADO, ConfigLaberinto.textura(ConfigLaberinto.ruta_enemigo(tema, ConfigLaberinto.enemigo_tema(tema).derrotado)))
	cuadros.remove_animation("default")
	_sprite.sprite_frames = cuadros
	_sprite.play(ANIM_CAMINAR)


func mover_a(destino: Vector2i, duracion: float) -> void:
	if destino.x != celda.x:
		_sprite.flip_h = destino.x > celda.x # los sprites de Kenney miran a la izquierda
	celda = destino
	create_tween().tween_property(self, "position", ConfigLaberinto.centro_de(destino), duracion)


func derrotar() -> void:
	vivo = false
	_sprite.play(ANIM_DERROTADO)
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 0.0, DURACION_DERROTA_S)
	await tween.finished
	visible = false


func reaparecer() -> void:
	celda = origen
	position = ConfigLaberinto.centro_de(origen)
	modulate.a = 1.0
	visible = true
	vivo = true
	_sprite.play(ANIM_CAMINAR)
