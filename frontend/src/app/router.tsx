import { type RouteObject, createBrowserRouter } from 'react-router'

import { ErrorVista } from '../componentes/ui/EstadoVista'
import { Ingresar } from '../paginas/Ingresar'
import { Inicio } from '../paginas/Inicio'
import { Laboratorio } from '../paginas/Laboratorio'
import { Logros } from '../paginas/Logros'
import { Mapa } from '../paginas/Mapa'
import { NoEncontrada } from '../paginas/NoEncontrada'
import { Privacidad } from '../paginas/Privacidad'
import { Registro } from '../paginas/Registro'
import { RutaProtegida, SoloAnonimo } from './Guardias'
import { Layout } from './Layout'
import { PaginaDesafio, PaginaMundo } from './paginasDiferidas'
import { RUTAS } from './rutas'

/** Definición de rutas, compartida por la app (navegador) y las pruebas (memoria). */
export const rutas: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <ErrorVista />,
    children: [
      { path: RUTAS.inicio, element: <Inicio /> },
      { path: RUTAS.ingresar, element: <SoloAnonimo><Ingresar /></SoloAnonimo> },
      { path: RUTAS.registro, element: <SoloAnonimo><Registro /></SoloAnonimo> },
      { path: RUTAS.privacidad, element: <Privacidad /> },
      {
        element: <RutaProtegida />,
        children: [
          { path: RUTAS.mapa, element: <Mapa /> },
          { path: RUTAS.logros, element: <Logros /> },
          { path: RUTAS.mundo, element: <PaginaMundo /> },
          { path: RUTAS.desafio, element: <PaginaDesafio /> },
        ],
      },
      // Laboratorio del motor: solo en desarrollo (import.meta.env.DEV es false en el build).
      ...(import.meta.env.DEV ? [{ path: '/laboratorio', element: <Laboratorio /> }] : []),
      { path: '*', element: <NoEncontrada /> },
    ],
  },
]

export const crearRouter = () => createBrowserRouter(rutas)
