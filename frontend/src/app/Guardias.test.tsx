import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useSesion } from '../estado/sesion'
import {
  PERFIL_PRUEBA,
  cuerpoError,
  montarEn,
  prepararSesion,
  respuestaApiJuego,
  respuestaJson,
  simularFetch,
} from '../pruebas/utilidades'
import { textos } from '../textos/es'

describe('rutas protegidas y arranque de sesión', () => {
  it('sin sesión, el mapa redirige a Ingresar', async () => {
    prepararSesion('anonima')

    const router = montarEn('/mapa')

    expect(await screen.findByRole('heading', { name: textos.ingresar.titulo })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ingresar')
  })

  it('con sesión, Ingresar lleva directo al mapa', async () => {
    prepararSesion('autenticada', PERFIL_PRUEBA)
    simularFetch(respuestaApiJuego)

    const router = montarEn('/ingresar')

    expect(await screen.findByText(textos.mapa.bienvenida('Ada'))).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/mapa')
  })

  it('al abrir la app recupera la sesión con la cookie de refresh', async () => {
    prepararSesion('verificando')
    simularFetch((url) =>
      url.endsWith('/auth/refresh/') ? respuestaJson(200, { access: 'recuperado' }) : respuestaApiJuego(url),
    )

    montarEn('/mapa')

    expect(screen.getByRole('status')).toHaveTextContent(textos.estados.cargando)
    expect(await screen.findByText(textos.mapa.bienvenida('Ada'))).toBeInTheDocument()
  })

  it('si la cookie de refresh ya no sirve, termina en Ingresar', async () => {
    prepararSesion('verificando')
    simularFetch(() => respuestaJson(401, cuerpoError('sesion_invalida')))

    const router = montarEn('/mapa')

    expect(await screen.findByRole('heading', { name: textos.ingresar.titulo })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ingresar')
  })

  it('cerrar sesión desde el mapa lleva al inicio (no a Ingresar) y olvida el token', async () => {
    prepararSesion('autenticada', PERFIL_PRUEBA)
    const fetch = simularFetch((url) =>
      url.endsWith('/auth/logout/') ? new Response(null, { status: 204 }) : respuestaApiJuego(url),
    )
    const router = montarEn('/mapa')

    await userEvent.setup().click(await screen.findByRole('button', { name: textos.navegacion.cerrarSesion }))

    expect(await screen.findByRole('link', { name: textos.inicio.empezar })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(useSesion.getState()).toMatchObject({ estado: 'anonima', access: null })
    const logout = fetch.mock.calls.find(([url]) => String(url).endsWith('/auth/logout/'))!
    expect(logout[1]!.headers).toMatchObject({ 'X-CodeQuest-Cliente': 'web' })
  })

  it('una ruta inexistente muestra la página de "no encontrada"', async () => {
    prepararSesion('anonima')

    montarEn('/zona-secreta')

    expect(await screen.findByRole('heading', { name: textos.noEncontrada.titulo })).toBeInTheDocument()
  })
})
