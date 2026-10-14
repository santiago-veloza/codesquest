/**
 * Al abrir la app el access token no existe (vive solo en memoria). Si la cookie HttpOnly de
 * refresh sigue vigente, se recupera la sesión sin pedir de nuevo la contraseña.
 */
import { useEffect } from 'react'

import { renovarSesion } from '../api/cliente'
import { obtenerPerfil } from '../api/cuenta'
import { useSesion } from '../estado/sesion'

let restauracionEnCurso: Promise<void> | null = null

export function restaurarSesion(): Promise<void> {
  restauracionEnCurso ??= ejecutar().finally(() => {
    restauracionEnCurso = null
  })
  return restauracionEnCurso
}

async function ejecutar(): Promise<void> {
  const sesion = useSesion.getState()
  if (!(await renovarSesion())) {
    sesion.cerrar()
    return
  }
  try {
    const perfil = await obtenerPerfil()
    const access = useSesion.getState().access
    if (access) useSesion.getState().iniciar(access, perfil)
    else sesion.cerrar()
  } catch {
    sesion.cerrar()
  }
}

export function useArranqueSesion(): void {
  const estado = useSesion((s) => s.estado)
  useEffect(() => {
    if (estado === 'verificando') void restaurarSesion()
  }, [estado])
}
