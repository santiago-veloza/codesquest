/**
 * Estado de la sesión (Zustand). El access token vive SOLO en memoria: no se guarda en
 * localStorage (un XSS no podría robar una sesión larga). El refresh está en una cookie HttpOnly.
 */
import { create } from 'zustand'

import type { Perfil } from '../api/tipos'

/** "verificando": al cargar la app aún no se sabe si la cookie de refresh sigue siendo válida. */
export type EstadoSesion = 'verificando' | 'autenticada' | 'anonima'

/**
 * Por qué terminó la sesión. Decide a dónde lleva la ruta protegida: si el usuario la cerró va al
 * inicio; si expiró, a Ingresar recordando a dónde quería ir.
 */
export type MotivoCierre = 'usuario' | 'expirada'

interface SesionStore {
  estado: EstadoSesion
  access: string | null
  perfil: Perfil | null
  motivoCierre: MotivoCierre | null
  iniciar: (access: string, perfil: Perfil) => void
  ponerAccess: (access: string) => void
  ponerPerfil: (perfil: Perfil) => void
  cerrar: (motivo?: MotivoCierre) => void
}

export const useSesion = create<SesionStore>()((set) => ({
  estado: 'verificando',
  access: null,
  perfil: null,
  motivoCierre: null,
  iniciar: (access, perfil) => set({ estado: 'autenticada', access, perfil, motivoCierre: null }),
  ponerAccess: (access) => set({ access }),
  ponerPerfil: (perfil) => set({ perfil }),
  cerrar: (motivo = 'expirada') => set({ estado: 'anonima', access: null, perfil: null, motivoCierre: motivo }),
}))
