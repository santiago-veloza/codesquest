// Fuentes OFL servidas localmente (no Google Fonts: no se envía la IP del estudiante a terceros).
import '@fontsource/press-start-2p/400.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './estilos/tokens.css'
import './estilos/base.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { crearClienteConsultas } from './app/clienteConsultas'
import { crearRouter } from './app/router'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No se encontró el elemento #root en index.html')

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={crearClienteConsultas()}>
      <RouterProvider router={crearRouter()} />
    </QueryClientProvider>
  </StrictMode>,
)
