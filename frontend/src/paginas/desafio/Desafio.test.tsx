import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EjecutarFn, ResultadoEjecucion } from '../../motor/tipos'
import {
  DESAFIO_PRUEBA,
  PERFIL_PRUEBA,
  cuerpoError,
  montarEn,
  prepararSesion,
  respuestaApiJuego,
  respuestaJson,
  simularFetch,
} from '../../pruebas/utilidades'
import { textos } from '../../textos/es'

// El motor real (Pyodide en un Worker) se prueba aparte; aquí se simula su respuesta.
const ejecutar = vi.fn<EjecutarFn>()
vi.mock('../../motor/ejecutorCompartido', () => ({
  obtenerEjecutor: () => ({ ejecutar, esperarListo: () => Promise.resolve(true) }),
}))

const resultado = (variables: ResultadoEjecucion['variables'], salida = ''): ResultadoEjecucion => ({
  salida,
  variables,
  acciones: [],
  error: null,
  reglas: [],
})

beforeEach(() => {
  localStorage.clear()
  prepararSesion('autenticada', PERFIL_PRUEBA)
  ejecutar.mockReset()
})

async function abrirConCodigo(codigo: string) {
  localStorage.setItem(`codequest:borrador:${DESAFIO_PRUEBA.id}`, codigo)
  const fetch = simularFetch(respuestaApiJuego)
  montarEn(`/desafios/${DESAFIO_PRUEBA.id}`)
  await screen.findByRole('heading', { name: DESAFIO_PRUEBA.titulo })
  return fetch
}

const botonEjecutar = () => screen.findByRole('button', { name: textos.desafio.ejecutar })

describe('panel de desafío', () => {
  it('muestra enunciado y el código base con el hueco en el editor', async () => {
    simularFetch(respuestaApiJuego)
    montarEn(`/desafios/${DESAFIO_PRUEBA.id}`)

    expect(await screen.findByText(DESAFIO_PRUEBA.enunciado)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: textos.desafio.tuCodigo })).toHaveTextContent('energia = ______')
  })

  it('con el hueco sin completar explica qué falta sin ejecutar', async () => {
    await abrirConCodigo('energia = ______')

    await userEvent.click(await botonEjecutar())

    expect(await screen.findByRole('alert')).toHaveTextContent('Falta completar el código')
    expect(ejecutar).not.toHaveBeenCalled()
  })

  it('una solución correcta muestra "¡Código correcto!" y la salida en la consola', async () => {
    ejecutar.mockResolvedValue(resultado({ energia: { tipo: 'int', valor: 100, serializable: true, repr: '100' } }, 'listo\n'))
    await abrirConCodigo('energia = 100\nprint("listo")')

    await userEvent.click(await botonEjecutar())

    expect(await screen.findByText(textos.desafio.correcto)).toBeInTheDocument()
    expect(screen.getByText('listo')).toBeInTheDocument()
    expect(ejecutar).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'energia = 100\nprint("listo")' }))
  })

  it('registra el intento en el servidor con el resultado y las pistas usadas', async () => {
    ejecutar.mockResolvedValue(resultado({ energia: { tipo: 'int', valor: 100, serializable: true, repr: '100' } }))
    const fetch = await abrirConCodigo('energia = 100')
    await userEvent.click(screen.getByRole('button', { name: textos.desafio.verPista(1, 3) }))

    await userEvent.click(await botonEjecutar())

    await screen.findByText(textos.desafio.correcto)
    const llamada = fetch.mock.calls.find(([url]) => String(url).endsWith(`/desafios/${DESAFIO_PRUEBA.id}/intentos/`))!
    expect(JSON.parse(String(llamada[1]!.body))).toMatchObject({
      codigo_enviado: 'energia = 100',
      resultado: 'correcto',
      pistas_usadas: 1,
      tipo_error: '',
    })
  })

  it('al acertar muestra la XP ganada, el logro nuevo y actualiza la barra de experiencia', async () => {
    ejecutar.mockResolvedValue(resultado({ energia: { tipo: 'int', valor: 100, serializable: true, repr: '100' } }))
    await abrirConCodigo('energia = 100')

    await userEvent.click(await botonEjecutar())

    const resumen = await screen.findByText(textos.recompensa.xp(15), { selector: 'p span' })
    expect(resumen.closest('[role="status"]')).toHaveTextContent(textos.recompensa.logro('Primer Código'))
    // También aparece el aviso flotante y la barra del encabezado avanza.
    expect(screen.getByRole('region', { name: textos.recompensa.region })).toHaveTextContent(textos.recompensa.xp(15))
    expect(screen.getByRole('progressbar', { name: textos.experiencia.etiqueta(1) })).toHaveAttribute('aria-valuenow', '15')
  })

  it('un hueco sin completar no se registra como intento', async () => {
    const fetch = await abrirConCodigo('energia = ______')

    await userEvent.click(await botonEjecutar())

    await screen.findByRole('alert')
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/intentos/'))).toBe(false)
  })

  it('una solución incorrecta explica la diferencia', async () => {
    ejecutar.mockResolvedValue(resultado({ energia: { tipo: 'int', valor: 10, serializable: true, repr: '10' } }))
    await abrirConCodigo('energia = 10')

    await userEvent.click(await botonEjecutar())

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(textos.desafio.incorrecto)
    expect(alerta).toHaveTextContent('«energia» vale 10, pero debería valer 100.')
  })

  it('un error de Python se muestra traducido con su sugerencia', async () => {
    ejecutar.mockResolvedValue({
      ...resultado({}),
      error: { tipo: 'NameError', mensaje: '', linea: 1, nombre: 'enrgia', sugerencia: 'energia' },
    })
    await abrirConCodigo('enrgia = 100\nprint(enrgia2)')

    await userEvent.click(await botonEjecutar())

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Python no conoce ese nombre')
    expect(alerta).toHaveTextContent('¿Quisiste decir «energia»?')
  })

  it('las pistas se revelan de una en una', async () => {
    await abrirConCodigo('energia = ______')
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: textos.desafio.verPista(1, 3) }))
    await usuario.click(screen.getByRole('button', { name: textos.desafio.verPista(2, 3) }))

    const pistas = within(screen.getByRole('region', { name: textos.desafio.pistas }))
    expect(pistas.getByText('Pista uno')).toBeInTheDocument()
    expect(pistas.getByText('Pista dos')).toBeInTheDocument()
    expect(pistas.queryByText('Pista tres')).not.toBeInTheDocument()
  })

  it('reiniciar vuelve al código base y borra el borrador', async () => {
    await abrirConCodigo('energia = 5')

    await userEvent.click(screen.getByRole('button', { name: textos.desafio.reiniciar }))

    expect(screen.getByRole('textbox', { name: textos.desafio.tuCodigo })).toHaveTextContent('energia = ______')
    expect(localStorage.getItem(`codequest:borrador:${DESAFIO_PRUEBA.id}`)).toBeNull()
  })

  it('un desafío de un mundo bloqueado muestra el motivo', async () => {
    simularFetch(() => respuestaJson(403, cuerpoError('sin_permiso', 'Este mundo aún está bloqueado.')))
    montarEn('/desafios/99')

    expect(await screen.findByRole('alert')).toHaveTextContent('Este mundo aún está bloqueado.')
  })
})

describe('mapa de mundos', () => {
  it('lista los mundos con su estado y solo deja entrar a los disponibles', async () => {
    simularFetch(respuestaApiJuego)
    montarEn('/mapa')

    expect(await screen.findByRole('heading', { name: 'La Ciudad de las Variables' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(`${textos.mundos.entrar}\\s+La Ciudad de las Variables`) })).toHaveAttribute('href', '/mundos/1')
    expect(screen.queryByRole('link', { name: /El Bosque de las Decisiones/ })).not.toBeInTheDocument()
    expect(screen.getByText(textos.mundos.bloqueadoAyuda)).toBeInTheDocument()
  })

})
