import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

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

async function llenarYEnviar(email: string, contrasena: string) {
  const usuario = userEvent.setup()
  await usuario.type(await screen.findByLabelText(textos.campos.email), email)
  await usuario.type(screen.getByLabelText(textos.campos.contrasena), contrasena)
  await usuario.click(screen.getByRole('button', { name: textos.ingresar.enviar }))
}

beforeEach(() => {
  localStorage.clear()
  prepararSesion('anonima')
})

describe('página Ingresar', () => {
  it('con credenciales correctas guarda la sesión y vuelve a la página que se pidió', async () => {
    const fetch = simularFetch((url) =>
      url.endsWith('/auth/login/')
        ? respuestaJson(200, { access: 'token', perfil: PERFIL_PRUEBA })
        : respuestaApiJuego(url),
    )
    const router = montarEn('/mapa') // redirige a /ingresar recordando el destino

    await llenarYEnviar('ada@correo.com', 'Clave-Segura-2026')

    expect(await screen.findByText(textos.mapa.bienvenida('Ada'))).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/mapa')
    expect(useSesion.getState()).toMatchObject({ estado: 'autenticada', access: 'token' })
    const cuerpo = JSON.parse(String(fetch.mock.calls[0]![1]!.body)) as Record<string, string>
    expect(cuerpo).toEqual({ email: 'ada@correo.com', password: 'Clave-Segura-2026' })
  })

  it('al ingresar se borran los borradores que dejó otra cuenta en este navegador', async () => {
    localStorage.setItem('codequest:borrador:7', 'energia = 100')
    localStorage.setItem('codequest:otra-preferencia', 'se queda')
    simularFetch((url) =>
      url.endsWith('/auth/login/') ? respuestaJson(200, { access: 'token', perfil: PERFIL_PRUEBA }) : respuestaApiJuego(url),
    )
    montarEn('/ingresar')

    await llenarYEnviar('ada@campusucc.edu.co', 'Clave-Segura-2026')

    expect(await screen.findByText(textos.mapa.bienvenida('Ada'))).toBeInTheDocument()
    expect(localStorage.getItem('codequest:borrador:7')).toBeNull()
    expect(localStorage.getItem('codequest:otra-preferencia')).toBe('se queda')
  })

  it('al cerrar sesión también se borran los borradores', async () => {
    localStorage.setItem('codequest:borrador:7', 'energia = 100')
    prepararSesion('autenticada', PERFIL_PRUEBA)
    simularFetch((url) => (url.endsWith('/auth/logout/') ? respuestaJson(204) : respuestaApiJuego(url)))
    montarEn('/mapa')

    await userEvent.click(await screen.findByRole('button', { name: textos.navegacion.cerrarSesion }))

    expect(await screen.findByRole('link', { name: textos.navegacion.ingresar })).toBeInTheDocument()
    expect(localStorage.getItem('codequest:borrador:7')).toBeNull()
  })

  it('con credenciales incorrectas muestra un mensaje genérico accesible', async () => {
    simularFetch(() => respuestaJson(401, cuerpoError('credenciales_invalidas')))
    montarEn('/ingresar')

    await llenarYEnviar('ada@correo.com', 'mala')

    expect(await screen.findByRole('alert')).toHaveTextContent(textos.errores.porCodigo.credenciales_invalidas!)
    expect(useSesion.getState().estado).toBe('anonima')
  })

  it('al superar el límite de intentos explica que hay que esperar', async () => {
    simularFetch(() => respuestaJson(429, cuerpoError('demasiadas_solicitudes')))
    montarEn('/ingresar')

    await llenarYEnviar('ada@correo.com', 'mala')

    expect(await screen.findByRole('alert')).toHaveTextContent(textos.errores.porCodigo.demasiadas_solicitudes!)
  })

  it('mientras envía, el botón se deshabilita y lo anuncia', async () => {
    simularFetch(() => new Promise<Response>(() => {})) // nunca responde
    montarEn('/ingresar')

    await llenarYEnviar('ada@correo.com', 'Clave-Segura-2026')

    const boton = await screen.findByRole('button', { name: textos.ingresar.enviando })
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
  })
})
