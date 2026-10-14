/**
 * Preferencia de sonido del jugador (volumen y silencio). Se recuerda en este dispositivo como
 * comodidad; si el almacenamiento no está disponible se usan los valores por defecto.
 */
import { create } from 'zustand'

import { SONIDO } from '../config/juego'
import { guardarLocal, leerLocal } from '../utilidades/almacenamientoLocal'

const CLAVE = 'sonido'

export interface PreferenciaSonido {
  volumen: number
  silencio: boolean
}

const acotar = (volumen: number) => Math.min(Math.max(volumen, 0), 1)

export function leerPreferencia(): PreferenciaSonido {
  const porDefecto = { volumen: SONIDO.volumenPorDefecto, silencio: false }
  try {
    const guardada = JSON.parse(leerLocal(CLAVE) ?? 'null') as Partial<PreferenciaSonido> | null
    if (!guardada) return porDefecto
    return {
      volumen: typeof guardada.volumen === 'number' ? acotar(guardada.volumen) : porDefecto.volumen,
      silencio: guardada.silencio === true,
    }
  } catch {
    return porDefecto
  }
}

interface SonidoStore extends PreferenciaSonido {
  ponerVolumen: (volumen: number) => void
  alternarSilencio: () => void
}

export const useSonido = create<SonidoStore>()((set, get) => {
  const guardar = () => guardarLocal(CLAVE, JSON.stringify({ volumen: get().volumen, silencio: get().silencio }))
  return {
    ...leerPreferencia(),
    // Subir el volumen desde 0 o estando en silencio vuelve a activar el sonido.
    ponerVolumen: (volumen) => {
      set({ volumen: acotar(volumen), silencio: volumen <= 0 })
      guardar()
    },
    alternarSilencio: () => {
      set(({ silencio }) => ({ silencio: !silencio }))
      guardar()
    },
  }
})
