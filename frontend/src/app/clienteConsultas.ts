import { QueryClient } from '@tanstack/react-query'

import { ErrorApi } from '../api/cliente'

const REINTENTOS_MAXIMOS = 2
const ESTADO_ERROR_SERVIDOR = 500

/** Reintenta solo fallos de red o del servidor; un 4xx no cambiará repitiendo la petición. */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (intentos, error) =>
          intentos < REINTENTOS_MAXIMOS &&
          !(error instanceof ErrorApi && error.estado > 0 && error.estado < ESTADO_ERROR_SERVIDOR),
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}
