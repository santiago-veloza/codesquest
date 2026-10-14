## Corazones de vida en el HUD (arte Kenney, CC0).
class_name BarraVida
extends HBoxContainer

var _corazones: Array[TextureRect] = []


func _ready() -> void:
	position = ConfigLaberinto.POSICION_VIDA
	for i in ConfigLaberinto.CORAZONES:
		var corazon := TextureRect.new()
		corazon.custom_minimum_size = Vector2.ONE * ConfigLaberinto.TAM_CORAZON
		corazon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		corazon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(corazon)
		_corazones.append(corazon)


func mostrar(vida: VidaJugador) -> void:
	var estados := vida.corazones()
	for i in _corazones.size():
		_corazones[i].texture = ConfigLaberinto.textura(ConfigLaberinto.TEXTURAS_CORAZON[estados[i]])
