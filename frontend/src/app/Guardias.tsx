import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { Cargando } from '../componentes/ui/EstadoVista'
import { useSesion } from '../estado/sesion'
import { RUTAS } from './rutas'

/**
 * Solo deja pasar con sesión. Sin sesión: si el usuario la cerró, al inicio; si no la tenía o
 * expiró, a "Ingresar" recordando a dónde quería ir.
 */
export function RutaProtegida() {
  const estado = useSesion((s) => s.estado)
  const motivoCierre = useSesion((s) => s.motivoCierre)
  const ubicacion = useLocation()

  if (estado === 'verificando') return <Cargando />
  if (estado === 'anonima') {
    return motivoCierre === 'usuario' ? (
      <Navigate to={RUTAS.inicio} replace />
    ) : (
      <Navigate to={RUTAS.ingresar} replace state={{ desde: ubicacion.pathname }} />
    )
  }
  return <Outlet />
}

/** Ingresar y Registro no tienen sentido con sesión activa: se va directo al mapa. */
export function SoloAnonimo({ children }: { children: ReactNode }) {
  const estado = useSesion((s) => s.estado)

  if (estado === 'verificando') return <Cargando />
  if (estado === 'autenticada') return <Navigate to={RUTAS.mapa} replace />
  return children
}
