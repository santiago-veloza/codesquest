import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

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

async function llenarFormulario({ aceptar = true } = {}) {
  const usuario = userEvent.setup()
  await usuario.type(await screen.findByLabelText(textos.campos.email), 'ada@correo.com')
  await usuario.type(screen.getByLabelText(textos.campos.apodo), 'Ada')
  await usuario.type(screen.getByLabelText(textos.campos.contrasena), 'Lovelace-1815')
  await usuario.click(screen.getByRole('radio', { name: textos.avatares.chispa }))
  if (aceptar) await usuario.click(screen.getByRole('checkbox'))
  await usuario.click(screen.getByRole('button', { name: textos.registro.enviar }))
}

beforeEach(() => prepararSesion('anonima'))

describe('página Registro', () => {
  it('sin aceptar el aviso de privacidad no envía nada y lo explica', async () => {
    const fetch = simularFetch(() => respuestaJson(500))
    montarEn('/registro')

    await llenarFormulario({ aceptar: false })

    expect(await screen.findByText(textos.registro.debesAceptar)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('envía el avatar elegido y el consentimiento, y entra al mapa', async () => {
    const fetch = simularFetch((url) =>
      url.endsWith('/auth/registro/')
        ? respuestaJson(201, { access: 'token', perfil: PERFIL_PRUEBA })
        : respuestaApiJuego(url),
    )
    montarEn('/registro')

    await llenarFormulario()

    expect(await screen.findByText(textos.mapa.bienvenida('Ada'))).toBeInTheDocument()
    const cuerpo = JSON.parse(String(fetch.mock.calls[0]![1]!.body)) as Record<string, unknown>
    expect(cuerpo).toMatchObject({ avatar: 'chispa', acepta_privacidad: true, apodo: 'Ada' })
  })

  it('muestra los errores del servidor junto a cada campo', async () => {
    simularFetch(() =>
      respuestaJson(
        400,
        cuerpoError('datos_invalidos', 'Los datos enviados no son válidos.', {
          password: ['Esta contraseña es demasiado común.'],
        }),
      ),
    )
    montarEn('/registro')

    await llenarFormulario()

    expect(await screen.findByText('Esta contraseña es demasiado común.')).toBeInTheDocument()
    expect(screen.getByLabelText(textos.campos.contrasena)).toHaveAttribute('aria-invalid', 'true')
    // Si todos los errores son de campos, no se repite un aviso general arriba.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el enlace al aviso de privacidad abre en otra pestaña sin perder el formulario', async () => {
    montarEn('/registro')

    const enlace = await screen.findByRole('link', { name: textos.registro.avisoPrivacidad })

    expect(enlace).toHaveAttribute('href', '/privacidad')
    expect(enlace).toHaveAttribute('target', '_blank')
  })
})
