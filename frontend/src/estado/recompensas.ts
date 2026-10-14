/**
 * Aplica una recompensa que devolvió el servidor: actualiza el perfil en memoria (barra de XP del
 * encabezado y caché del perfil), invalida el catálogo de logros y encola los avisos.
 */
import type { QueryClient } from '@tanstack/react-query'

import { urlIcono } from '../api/gamificacion'
import { type Efecto, reproducirEfecto } from '../audio/efectos'
import type { Perfil, Recompensa } from '../api/tipos'
import { CLAVES_CONSULTA } from '../app/rutas'
import { textos } from '../textos/es'
import { type Notificacion, useNotificaciones } from './notificaciones'
import { useSesion } from './sesion'

export function avisosDe(recompensa: Recompensa): Omit<Notificacion, 'id'>[] {
  const avisos: Omit<Notificacion, 'id'>[] = []
  if (recompensa.xp_otorgada > 0) avisos.push({ tipo: 'xp', texto: textos.recompensa.xp(recompensa.xp_otorgada) })
  // Puntos que no vienen de la XP (p. ej. el bonus por completar un mundo).
  const puntosExtra = recompensa.puntos_otorgados - recompensa.xp_otorgada
  if (puntosExtra > 0) avisos.push({ tipo: 'xp', texto: textos.recompensa.puntos(puntosExtra) })
  if (recompensa.subio_de_nivel) avisos.push({ tipo: 'nivel', texto: textos.recompensa.subioDeNivel(recompensa.nivel) })
  for (const logro of recompensa.logros_nuevos) {
    avisos.push({ tipo: 'logro', texto: textos.recompensa.logro(logro.nombre), icono: urlIcono(logro.icono) })
  }
  return avisos
}

/** Un solo sonido por recompensa, el más importante (para no amontonarlos). */
export function efectoDe(recompensa: Recompensa): Efecto | null {
  if (recompensa.logros_nuevos.length > 0) return 'logro'
  if (recompensa.subio_de_nivel) return 'nivel'
  if (recompensa.xp_otorgada > 0) return 'acierto'
  return null
}

export function aplicarRecompensa(recompensa: Recompensa, clienteConsultas: QueryClient) {
  const actualizar = (perfil: Perfil): Perfil => ({
    ...perfil,
    experiencia: recompensa.experiencia,
    puntos: recompensa.puntos,
    nivel: recompensa.nivel,
    experiencia_nivel_actual: recompensa.experiencia_nivel_actual,
    experiencia_siguiente_nivel: recompensa.experiencia_siguiente_nivel,
  })
  const { perfil, ponerPerfil } = useSesion.getState()
  if (perfil) ponerPerfil(actualizar(perfil))
  clienteConsultas.setQueryData<Perfil>(CLAVES_CONSULTA.perfil, (previo) => previo && actualizar(previo))
  if (recompensa.logros_nuevos.length > 0) void clienteConsultas.invalidateQueries({ queryKey: CLAVES_CONSULTA.logros })
  useNotificaciones.getState().agregar(avisosDe(recompensa))
  const efecto = efectoDe(recompensa)
  if (efecto) reproducirEfecto(efecto)
}
