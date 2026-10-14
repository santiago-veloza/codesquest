## Constantes de la escena. Único lugar para tiempos, distancias y límites (sin números mágicos).
class_name ConfigEscena
extends RefCounted

# --- Contrato con React ---
const VERSION_CONTRATO := 1
const MAX_ACCIONES := 500 # Evita que una cola enorme congele la escena.
const ACCIONES_VALIDAS: Array[String] = ["avanzar", "saltar", "atacar", "esperar"]

# --- Movimiento del protagonista ---
const PASO_PX := 96.0
const ALTURA_SALTO_PX := 80.0
const DURACION_ACCION_S := 0.45
const DURACION_REDUCIDA_S := 0.1 # Con "reducir movimiento" las acciones son casi instantáneas.
const POSICION_INICIAL := Vector2(160, 560)

# --- Capas de parallax (factor de desplazamiento respecto a la cámara) ---
const ESCALA_FONDO_LEJANO := 0.15
const ESCALA_FONDO_MEDIO := 0.45
const ANCHO_REPETICION_PX := 1280.0
const SEMILLA_EDIFICIOS := 42 # Fija: la ciudad placeholder se ve siempre igual.

# --- Solo para probar en el editor (Enter) sin la página web ---
const ACCIONES_DEMO: Array[String] = ["avanzar", "avanzar", "saltar", "avanzar", "atacar", "esperar"]
