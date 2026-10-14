/** Cola de avisos flotantes de recompensa (Zustand). Solo muestra lo que decidió el servidor. */
import { create } from 'zustand'

import { NOTIFICACIONES } from '../config/juego'

export type TipoNotificacion = 'xp' | 'nivel' | 'logro'

export interface Notificacion {
  id: number
  tipo: TipoNotificacion
  texto: string
  /** Ruta pública de un icono (solo logros). */
  icono?: string
}

interface NotificacionesStore {
  avisos: Notificacion[]
  agregar: (avisos: Omit<Notificacion, 'id'>[]) => void
  quitar: (id: number) => void
}

let siguienteId = 1

export const useNotificaciones = create<NotificacionesStore>()((set) => ({
  avisos: [],
  agregar: (nuevos) =>
    set(({ avisos }) => ({
      avisos: [...avisos, ...nuevos.map((a) => ({ ...a, id: siguienteId++ }))].slice(-NOTIFICACIONES.maximoVisibles),
    })),
  quitar: (id) => set(({ avisos }) => ({ avisos: avisos.filter((a) => a.id !== id) })),
}))
