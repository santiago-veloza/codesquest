/**
 * Constantes de juego y del motor de ejecución que necesita la interfaz.
 * La fuente de verdad de XP, nivel y energía es backend/config/juego.py: el servidor envía la XP y
 * los umbrales de nivel junto con el perfil y cada recompensa, así que aquí no se repiten fórmulas.
 */
export const ENERGIA_MAXIMA = 100

/** Debe coincidir con backend/config/juego.py (TIEMPO_MAXIMO_INTENTO_MS). */
export const PROGRESO = {
  tiempoMaximoIntentoMs: 30 * 60 * 1000,
} as const

/** Avisos flotantes de recompensa (XP, nivel, logros). */
export const NOTIFICACIONES = {
  /** Tiempo que un aviso queda visible antes de cerrarse solo (también se puede cerrar a mano). */
  duracionMs: 6000,
  /** Avisos visibles a la vez; los más viejos se descartan. */
  maximoVisibles: 4,
} as const

/** Sonido de la interfaz (los del laberinto los reproduce Godot con el mismo volumen). */
export const SONIDO = {
  /** Debe coincidir con VOLUMEN_POR_DEFECTO de game/scripts/laberinto/config_laberinto.gd. */
  volumenPorDefecto: 0.6,
  /** Paso del deslizador de volumen (porcentaje). */
  pasoVolumen: 10,
  /** Kenney "New Platformer Pack" (CC0), en public/sonidos/. */
  efectos: {
    acierto: 'sonidos/sfx_coin.ogg',
    logro: 'sonidos/sfx_gem.ogg',
    nivel: 'sonidos/sfx_jump-high.ogg',
  },
} as const

/** Límites del motor de ejecución (sección 7 de la especificación). */
export const MOTOR = {
  /** Tiempo máximo de ejecución del código del estudiante; al superarlo se termina el Worker. */
  limiteTiempoMs: 3000,
  /** Tiempo máximo para descargar y preparar Python en el navegador (~12 MB la primera vez). */
  limiteCargaMs: 60_000,
  /** Caracteres máximos de salida (protege contra print dentro de un bucle infinito). */
  limiteSalida: 10_000,
  /** Acciones de juego máximas que el arnés registra por ejecución (las comparan las pruebas "estado_escena"). */
  limiteAcciones: 500,
  /** Marca del hueco que completa el estudiante en el código base. */
  marcaHueco: '______',
} as const
