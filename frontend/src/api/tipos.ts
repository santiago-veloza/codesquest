/**
 * Tipos de la API derivados del esquema OpenAPI generado (esquema.d.ts, `npm run generar:tipos`).
 * No se escriben a mano: si el backend cambia, se regenera y TypeScript señala lo que se rompe.
 */
import type { Prueba, Variante } from '../motor/evaluador'
import type { components } from './esquema'

type Esquemas = components['schemas']

// El servidor siempre envía todos los campos del perfil; en el esquema apodo/avatar figuran como
// opcionales solo porque también se usan para el PATCH parcial.
export type Perfil = Required<Esquemas['Perfil']>
export type Avatar = Esquemas['AvatarEnum']
export type DatosRegistro = Esquemas['RegistroRequest']
export type DatosIngreso = Esquemas['LoginRequest']
export type CambiosPerfil = Esquemas['PatchedPerfilRequest']
export type Access = Esquemas['Access']

export type Mundo = Esquemas['Mundo']
export type EstadoMundo = Esquemas['EstadoEnum']
export type Dificultad = Esquemas['DificultadEnum']
export type DesafioResumen = Esquemas['DesafioResumen']
export type MundoLaberinto = Esquemas['MundoLaberinto']
export type Obstaculo = Esquemas['Obstaculo']

export type Recompensa = Esquemas['Recompensa']
export type LogroResumen = Esquemas['LogroResumen']
export type LogroDelUsuario = Esquemas['LogroDelUsuario']

// pistas/pruebas/variantes son JSON en el modelo; su forma la valida content/esquemas al cargarse.
export type DesafioDetalle = Omit<Esquemas['DesafioDetalle'], 'pistas' | 'pruebas' | 'variantes'> & {
  pistas: string[]
  pruebas: Prueba[]
  variantes: Variante[]
}

export interface Sesion {
  access: string
  perfil: Perfil
}

/** Formato uniforme de error del backend (apps/nucleo/excepciones.py). */
export interface CuerpoError {
  error: {
    codigo: string
    mensaje: string
    detalles?: Record<string, string[]>
  }
}

export const AVATARES: readonly Avatar[] = ['byte', 'pixel', 'chispa']
