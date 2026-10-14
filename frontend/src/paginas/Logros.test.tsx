import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { PERFIL_PRUEBA, montarEn, prepararSesion, respuestaApiJuego, simularFetch } from '../pruebas/utilidades'
import { textos } from '../textos/es'

beforeEach(() => {
  prepararSesion('autenticada', PERFIL_PRUEBA)
  simularFetch(respuestaApiJuego)
})

describe('Página de logros', () => {
  it('muestra cuántos hay, cuáles se obtuvieron y cuáles faltan', async () => {
    montarEn('/logros')

    expect(await screen.findByText(textos.logros.resumen(1, 2))).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Primer Código' })).toBeInTheDocument()
    expect(screen.getByText(/Obtenido el 14 de octubre de 2026/)).toBeInTheDocument()
    expect(screen.getByText(textos.logros.pendiente)).toBeInTheDocument()
  })

  it('el encabezado enlaza a los logros y muestra la barra de experiencia', async () => {
    montarEn('/logros')

    expect(await screen.findByRole('link', { name: textos.navegacion.logros })).toHaveAttribute('href', '/logros')
    expect(screen.getByRole('progressbar', { name: textos.experiencia.etiqueta(1) })).toHaveAttribute('aria-valuemax', '24')
  })
})
