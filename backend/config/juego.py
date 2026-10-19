"""Constantes de juego. ÚNICO lugar donde se definen (sin números mágicos en el resto del código)."""

# --- Perfil ---
NIVEL_INICIAL = 1
ENERGIA_MAXIMA = 100
LARGO_MINIMO_APODO = 2
LARGO_MAXIMO_APODO = 30

# --- Progreso ---
PORCENTAJE_MAXIMO = 100

# --- Contenido ---
PISTAS_POR_DESAFIO = 3

# --- Intentos ---
LARGO_MAXIMO_CODIGO = 10_000  # caracteres del código enviado
TIEMPO_MAXIMO_INTENTO_MS = 30 * 60 * 1000  # un intento no puede reportar más de 30 min

# --- Gamificación (sección 10 de la especificación) ---
# XP de un desafío = su xp_base (10/20/30/50 según dificultad, definido en el contenido)
#   + BONUS_PRIMER_INTENTO si se acierta sin intentos previos
#   - PENALIZACION_POR_PISTA por cada pista usada, sin bajar de xp_base * FRACCION_MINIMA_XP.
# Solo se gana XP la PRIMERA vez que se resuelve cada desafío.
BONUS_PRIMER_INTENTO = 5
PENALIZACION_POR_PISTA = 2
FRACCION_MINIMA_XP = 0.5

# Umbral para alcanzar el nivel n: FACTOR_NIVEL * n * (n - 1) XP.
# La especificación propone 50 y pide calibrar para que todo el juego lleve al nivel 5-6. Con el
# contenido actual (15 desafíos, 465 XP máximo con el Núcleo) el factor 12 deja: nivel 2 = 24,
# 3 = 72, 4 = 144, 5 = 240, 6 = 360, 7 = 504: terminar todo lleva al nivel 6. Recalibrar al agregar
# desafíos (y revisar test_gamificacion).
FACTOR_NIVEL = 12

# Puntos = toda la XP ganada + este bonus por cada mundo completado.
BONUS_PUNTOS_MUNDO = 25
