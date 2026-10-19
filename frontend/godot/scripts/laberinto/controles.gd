## Acciones de movimiento: flechas y WASD (se registran por código para no depender del editor).
class_name ControlesLaberinto
extends RefCounted

const DISPARAR := "disparar"
const ACCIONES := {
	"disparar": [KEY_SPACE],
	"mover_arriba": [KEY_UP, KEY_W],
	"mover_abajo": [KEY_DOWN, KEY_S],
	"mover_izquierda": [KEY_LEFT, KEY_A],
	"mover_derecha": [KEY_RIGHT, KEY_D],
}
const DIRECCIONES := {
	"mover_arriba": Vector2i.UP,
	"mover_abajo": Vector2i.DOWN,
	"mover_izquierda": Vector2i.LEFT,
	"mover_derecha": Vector2i.RIGHT,
}


static func registrar() -> void:
	for accion: String in ACCIONES:
		if InputMap.has_action(accion):
			continue
		InputMap.add_action(accion)
		for tecla: int in ACCIONES[accion]:
			var evento := InputEventKey.new()
			evento.physical_keycode = tecla
			InputMap.action_add_event(accion, evento)


## Dirección que se está pulsando (la primera encontrada), o Vector2i.ZERO.
static func direccion_pulsada() -> Vector2i:
	for accion: String in DIRECCIONES:
		if Input.is_action_pressed(accion):
			return DIRECCIONES[accion]
	return Vector2i.ZERO
