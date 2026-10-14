/**
 * Páginas que se descargan bajo demanda: traen el editor (CodeMirror) y el motor de Python, que no
 * hacen falta para iniciar sesión ni para ver el mapa.
 */
import { Suspense, lazy } from 'react'

import { Cargando } from '../componentes/ui/EstadoVista'

const DesafioDiferido = lazy(() => import('../paginas/desafio/Desafio').then((m) => ({ default: m.Desafio })))
const MundoLaberintoDiferido = lazy(() =>
  import('../paginas/laberinto/MundoLaberinto').then((m) => ({ default: m.MundoLaberinto })),
)

export function PaginaDesafio() {
  return (
    <Suspense fallback={<Cargando />}>
      <DesafioDiferido />
    </Suspense>
  )
}

export function PaginaMundo() {
  return (
    <Suspense fallback={<Cargando />}>
      <MundoLaberintoDiferido />
    </Suspense>
  )
}
