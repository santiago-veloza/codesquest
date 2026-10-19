## Constantes del laberinto: tamaños, tiempos, límites y paletas por mundo (sin números mágicos).
class_name ConfigLaberinto
extends RefCounted

const TAM_CELDA := 64
const DURACION_PASO_S := 0.14
const DURACION_PASO_REDUCIDA_S := 0.0 # "reducir movimiento": el personaje aparece en la casilla
const DURACION_DESAPARECER_S := 0.5
const ZOOM_CAMARA := Vector2(1.2, 1.2)

# Límites de seguridad para lo que llega desde la página (entrada no confiable).
const MAX_FILAS := 64
const MAX_COLUMNAS := 64
const SIMBOLOS_VALIDOS := "wcase123456789"

# Minimapa (esquina superior derecha).
const MINIMAPA_MAX := Vector2(220, 150)
const MINIMAPA_MARGEN := 16.0
const MINIMAPA_PUNTO_JUGADOR := 3.0

# Paletas por mundo (coherentes con frontend/src/estilos/tokens.css).
const PALETAS := {
	1: {"fondo": Color("#0b1020"), "camino": Color("#141a33"), "pared": Color("#312e81"), "borde": Color("#22d3ee"),
		"obstaculo": Color("#f0abfc"), "jugador": Color("#22d3ee"), "salida": Color("#4ade80")},
	2: {"fondo": Color("#07150f"), "camino": Color("#0f241b"), "pared": Color("#14532d"), "borde": Color("#34d399"),
		"obstaculo": Color("#fbbf24"), "jugador": Color("#34d399"), "salida": Color("#fde68a")},
	3: {"fondo": Color("#120b1f"), "camino": Color("#1e1433"), "pared": Color("#3b2a5a"), "borde": Color("#c4b5fd"),
		"obstaculo": Color("#fb923c"), "jugador": Color("#c4b5fd"), "salida": Color("#4ade80")},
	4: {"fondo": Color("#16120a"), "camino": Color("#251e10"), "pared": Color("#5c4a1e"), "borde": Color("#fcd34d"),
		"obstaculo": Color("#93c5fd"), "jugador": Color("#fcd34d"), "salida": Color("#4ade80")},
	# El Núcleo de Bug Master: sistema corrupto (rojo) con destellos de terminal (verde).
	5: {"fondo": Color("#14070b"), "camino": Color("#240d14"), "pared": Color("#4c0519"), "borde": Color("#fb7185"),
		"obstaculo": Color("#4ade80"), "jugador": Color("#fb7185"), "salida": Color("#4ade80")},
}
const TEMA_POR_DEFECTO := 1

# --- Arte (Kenney "New Platformer Pack", CC0: ver CREDITS.md) ---
const RUTA_SPRITES := "res://assets/sprites/"
const TEXTURAS_TEMA := {
	1: {"pared": "tiles/bricks_grey.png", "candado": "tiles/lock_blue.png"}, # Ciudad
	2: {"pared": "tiles/terrain_grass_block_top.png", "candado": "tiles/lock_green.png"}, # Bosque
	3: {"pared": "tiles/terrain_stone_block_center.png", "candado": "tiles/lock_red.png"}, # Minas
	4: {"pared": "tiles/bricks_brown.png", "candado": "tiles/lock_yellow.png"}, # Reino
	5: {"pared": "tiles/block_strong_danger.png", "candado": "tiles/lock_red.png"}, # Núcleo
}
const PUERTA_CERRADA := "tiles/door_closed.png"
const PUERTA_ABIERTA := "tiles/door_open.png"
# Avatar del perfil (backend: Avatar) -> color del personaje en el paquete de arte.
const AVATARES := {"byte": "green", "pixel": "purple", "chispa": "pink"}
const AVATAR_POR_DEFECTO := "byte"
const POSES := ["front", "walk_a", "walk_b", "hit", "jump"]
const ESCALA_PERSONAJE := 0.75 # el sprite (128 px) tiene margen transparente: así el cuerpo llena la casilla

# Texto de estado del HUD: fondo oscuro para que se lea sobre cualquier pared.
const HUD_FONDO := Color(0.04, 0.06, 0.13, 0.85)
const HUD_RELLENO := 8
const FPS_CAMINAR := 8.0
const DURACION_GOLPE_S := 0.25

# --- Enemigos y disparo ---
const SIMBOLO_ENEMIGO := "e"
# Por mundo: sprite y segundos entre pasos (más rápidos en los mundos difíciles).
const ENEMIGOS_TEMA := {
	1: {"sprite": "mouse", "derrotado": "rest", "paso_s": 0.55},
	2: {"sprite": "ladybug", "derrotado": "rest", "paso_s": 0.5},
	3: {"sprite": "slime_spike", "derrotado": "flat", "paso_s": 0.42},
	4: {"sprite": "slime_fire", "derrotado": "flat", "paso_s": 0.35},
	# Núcleo: moscas (¡bugs!), las más rápidas. Sus cuadros se llaman fly_a/fly_b (no walk_a/walk_b).
	5: {"sprite": "fly", "derrotado": "rest", "paso_s": 0.3, "caminar": ["a", "b"]},
}
const POSES_ENEMIGO_POR_DEFECTO := ["walk_a", "walk_b"]
const REAPARICION_ENEMIGO_S := 12.0 # un enemigo derrotado vuelve a su punto de partida
const ESPERA_DISPARO_S := 0.35 # tiempo mínimo entre disparos
const DURACION_PROYECTIL_CELDA_S := 0.05
const PROYECTIL := "tiles/star.png"
const TAM_PROYECTIL := 32.0
const SEMILLA_PATRULLA := 7 # patrullas reproducibles (útil en pruebas)
const PROB_SEGUIR_RECTO := 0.75 # en un cruce, el enemigo suele seguir recto

# Laberinto de demostración para probar en el editor (sin la página web).
const MAPA_DEMO: Array[String] = [
	"wwwwwwwwwww",
	"wac1cwcccsw",
	"wwwwcwcwwww",
	"wcccc2ccccw",
	"wwwwwwwwwww",
]

# --- Vida del jugador ---
# Cada golpe de enemigo quita el 10 %; a 0 es game over. Se dibuja con 5 corazones (medio corazón = 10 %).
const VIDA_MAXIMA := 100
const DANO_ENEMIGO := 10
const CORAZONES := 5
const INVULNERABLE_TRAS_GOLPE_S := 1.0 # evita perder dos golpes seguidos del mismo enemigo
const TEXTURAS_CORAZON := {"lleno": "hud/hud_heart.png", "medio": "hud/hud_heart_half.png", "vacio": "hud/hud_heart_empty.png"}
const TAM_CORAZON := 32.0
const POSICION_VIDA := Vector2(16, 60) # debajo del texto de estado

# --- Sonido (Kenney "New Platformer Pack", CC0: ver CREDITS.md) ---
# React envía volumen (0-1) y silencio por configurar(); se aplica a cada reproductor.
const RUTA_SONIDOS := "res://assets/sonidos/"
const SONIDOS := {
	"disparo": "sfx_throw.ogg",
	"enemigo_derrotado": "sfx_disappear.ogg",
	"golpe": "sfx_hurt.ogg",
	"obstaculo": "sfx_select.ogg",
	"candado_abierto": "sfx_magic.ogg",
	"choque": "sfx_bump.ogg",
	"salida": "sfx_jump-high.ogg",
}
const VOLUMEN_POR_DEFECTO := 0.6
const REPRODUCTORES_SIMULTANEOS := 4 # disparos seguidos no cortan el sonido anterior


static func paleta(tema: int) -> Dictionary:
	return PALETAS.get(tema, PALETAS[TEMA_POR_DEFECTO])


static func textura(ruta_relativa: String) -> Texture2D:
	return load(RUTA_SPRITES + ruta_relativa)


static func texturas_tema(tema: int) -> Dictionary:
	return TEXTURAS_TEMA.get(tema, TEXTURAS_TEMA[TEMA_POR_DEFECTO])


static func enemigo_tema(tema: int) -> Dictionary:
	return ENEMIGOS_TEMA.get(tema, ENEMIGOS_TEMA[TEMA_POR_DEFECTO])


## Cuadros de la animación de caminar del enemigo del tema.
static func poses_enemigo(tema: int) -> Array:
	return enemigo_tema(tema).get("caminar", POSES_ENEMIGO_POR_DEFECTO)


static func ruta_enemigo(tema: int, pose: String) -> String:
	return "enemigos/%s_%s.png" % [enemigo_tema(tema).sprite, pose]


static func ruta_personaje(avatar: String, pose: String) -> String:
	return "personajes/character_%s_%s.png" % [AVATARES.get(avatar, AVATARES[AVATAR_POR_DEFECTO]), pose]


static func centro_de(celda: Vector2i) -> Vector2:
	return Vector2(celda) * TAM_CELDA + Vector2.ONE * (TAM_CELDA / 2.0)
