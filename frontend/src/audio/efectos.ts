/** Efectos de sonido de la interfaz (acierto, logro, nivel). Nunca rompen la página si fallan. */
import { SONIDO } from '../config/juego'
import { useSonido } from '../estado/sonido'

export type Efecto = keyof typeof SONIDO.efectos

export function reproducirEfecto(efecto: Efecto): void {
  const { volumen, silencio } = useSonido.getState()
  if (silencio || volumen <= 0) return
  try {
    const audio = new Audio(`${import.meta.env.BASE_URL}${SONIDO.efectos[efecto]}`)
    audio.volume = volumen
    // El navegador puede bloquear el audio sin interacción previa o no soportar el formato: se ignora.
    void audio.play()?.catch(() => undefined)
  } catch {
    // Sin soporte de audio: la recompensa igual se ve en pantalla.
  }
}
