## Protagonista placeholder (rectángulos). Se reemplaza por sprites en el paso de arte.
## Cada acción es una animación con Tween que se puede esperar con await.
class_name Protagonista
extends Node2D

const COLOR_CUERPO := Color("#22d3ee") # Cian del Mundo 1
const COLOR_VISOR := Color("#f0abfc") # Acento magenta suave
const TAMANO_CUERPO := Vector2(40, 64)
const GIRO_ATAQUE_RAD := 0.3

var movimiento_reducido := false


func _draw() -> void:
	draw_rect(Rect2(Vector2(-TAMANO_CUERPO.x / 2, -TAMANO_CUERPO.y), TAMANO_CUERPO), COLOR_CUERPO)
	draw_rect(Rect2(Vector2(2, -TAMANO_CUERPO.y + 10), Vector2(14, 8)), COLOR_VISOR)


func ejecutar(accion: String) -> void:
	var tween := create_tween()
	var duracion := _duracion()
	match accion:
		"avanzar":
			tween.tween_property(self, "position:x", position.x + ConfigEscena.PASO_PX, duracion)
		"saltar":
			var suelo := position.y
			tween.tween_property(self, "position:y", suelo - ConfigEscena.ALTURA_SALTO_PX, duracion / 2)
			tween.tween_property(self, "position:y", suelo, duracion / 2)
		"atacar":
			tween.tween_property(self, "rotation", GIRO_ATAQUE_RAD, duracion / 2)
			tween.tween_property(self, "rotation", 0.0, duracion / 2)
		"esperar":
			tween.tween_interval(duracion)
		_:
			push_error("Acción no implementada: %s" % accion)
			tween.kill()
			return
	await tween.finished


func _duracion() -> float:
	return ConfigEscena.DURACION_REDUCIDA_S if movimiento_reducido else ConfigEscena.DURACION_ACCION_S
