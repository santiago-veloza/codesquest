import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'

import type { Sesion } from '../api/tipos'
import { useSesion } from '../estado/sesion'
import { borrarTodosLosBorradores } from '../utilidades/borradores'
import { CLAVES_CONSULTA, RUTAS } from './rutas'

/** Tras ingresar o registrarse: guarda la sesión y lleva a donde el usuario quería ir. */
export function useAlIniciarSesion() {
  const clienteConsultas = useQueryClient()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? RUTAS.mapa

  return ({ access, perfil }: Sesion) => {
    // Lo que dejó escrito otra cuenta en este navegador no debe aparecerle a esta.
    borrarTodosLosBorradores()
    useSesion.getState().iniciar(access, perfil)
    clienteConsultas.setQueryData(CLAVES_CONSULTA.perfil, perfil)
    void navegar(destino, { replace: true })
  }
}
