/**
 * Laberinto: la escena de Godot se simula con su contrato real (window.codequestGodot / codequestHost),
 * igual que en el navegador. El motor de Python se simula (se prueba aparte).
 */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SONIDO } from '../../config/juego'
import type { EjecutarFn } from '../../motor/tipos'
import {
  DESAFIO_PRUEBA,
  LABERINTO_PRUEBA,
  PERFIL_PRUEBA,
  montarEn,
  prepararSesion,
  respuestaApiJuego,
  simularFetch,
} from '../../pruebas/utilidades'
import { textos } from '../../textos/es'

const ejecutar = vi.fn<EjecutarFn>()
vi.mock('../../motor/ejecutorCompartido', () => ({
  obtenerEjecutor: () => ({ ejecutar, esperarListo: () => Promise.resolve(true) }),
}))

interface VentanaJuego {
  codequestGodot?: Record<string, ReturnType<typeof vi.fn>>
  codequestHost?: { recibirEvento: (nombre: string, json: string) => void }
}

/** Simula la escena de Godot dentro del iframe y devuelve sus funciones espía. */
async function montarLaberinto() {
  const fetch = simularFetch(respuestaApiJuego)
  montarEn(`/mundos/${LABERINTO_PRUEBA.id}`)
  const iframe = (await screen.findByTitle(textos.laberinto.tituloEscena(LABERINTO_PRUEBA.nombre))) as HTMLIFrameElement
  const ventana = iframe.contentWindow as unknown as VentanaJuego
  const godot = {
    cargarLaberinto: vi.fn(),
    resolverObstaculo: vi.fn(),
    pausar: vi.fn(),
    reanudar: vi.fn(),
    configurar: vi.fn(),
  }
  ventana.codequestGodot = godot
  const emitir = (nombre: string, datos: object = {}) => ventana.codequestHost!.recibirEvento(nombre, JSON.stringify(datos))
  return { godot, emitir, fetch }
}

beforeEach(() => {
  localStorage.clear()
  prepararSesion('autenticada', PERFIL_PRUEBA)
  ejecutar.mockReset()
})

describe('mundo como laberinto', () => {
  it('cuando la escena está lista le envía el mapa, los obstáculos ya resueltos y el tema', async () => {
    const { godot, emitir } = await montarLaberinto()

    emitir('escena_lista')

    expect(godot.cargarLaberinto).toHaveBeenCalledWith(
      JSON.stringify({ mapa: LABERINTO_PRUEBA.mapa, resueltos: ['2'], tema: 1, avatar: PERFIL_PRUEBA.avatar }),
    )
    expect(godot.configurar).toHaveBeenCalledWith(JSON.stringify({ volumen: SONIDO.volumenPorDefecto, silencio: false }))
  })

  it('al silenciar desde el encabezado se avisa al juego en el momento', async () => {
    const { godot, emitir } = await montarLaberinto()
    emitir('escena_lista')

    await userEvent.click(screen.getByRole('button', { name: textos.sonido.silenciar }))

    expect(godot.configurar).toHaveBeenLastCalledWith(JSON.stringify({ volumen: SONIDO.volumenPorDefecto, silencio: true }))
  })

  it('lista los obstáculos con su estado (alternativa accesible a la escena)', async () => {
    await montarLaberinto()

    expect(screen.getByText(textos.laberinto.contador(1, 2))).toBeInTheDocument()
    expect(screen.getByText(textos.laberinto.obstaculo('1', 'La primera caja'))).toBeInTheDocument()
    expect(screen.getByText(textos.laberinto.resuelto)).toBeInTheDocument()
  })

  it('abrir un desafío desde la lista pausa el juego (los enemigos no atacan mientras escribe)', async () => {
    const { godot } = await montarLaberinto()

    await userEvent.click(screen.getByRole('button', { name: /Abrir desafío.*La primera caja/ }))

    expect(godot.pausar).toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'La primera caja' })).toBeInTheDocument()
  })

  it('chocar con un obstáculo abre su desafío; al superarlo, el obstáculo se abre en la escena', async () => {
    ejecutar.mockResolvedValue({
      salida: '',
      variables: { energia: { tipo: 'int', valor: 100, serializable: true, repr: '100' } },
      acciones: [],
      error: null,
      reglas: [],
    })
    localStorage.setItem(`codequest:borrador:${DESAFIO_PRUEBA.id}`, 'energia = 100')
    const { godot, emitir } = await montarLaberinto()
    const usuario = userEvent.setup()

    emitir('obstaculo', { simbolo: '1' })

    expect(await screen.findByRole('heading', { name: DESAFIO_PRUEBA.titulo })).toBeInTheDocument()
    await usuario.click(await screen.findByRole('button', { name: textos.desafio.ejecutar }))
    await usuario.click(await screen.findByRole('button', { name: textos.laberinto.continuar }))

    expect(godot.resolverObstaculo).toHaveBeenCalledWith('1')
    expect(screen.queryByRole('heading', { name: DESAFIO_PRUEBA.titulo })).not.toBeInTheDocument()
  })

  it('cerrar el desafío sin resolverlo devuelve el control al laberinto (el obstáculo sigue)', async () => {
    const { godot, emitir } = await montarLaberinto()

    emitir('obstaculo', { simbolo: '1' })
    await userEvent.click(await screen.findByRole('button', { name: textos.laberinto.volverAlLaberinto }))

    expect(godot.reanudar).toHaveBeenCalled()
    expect(godot.resolverObstaculo).not.toHaveBeenCalled()
  })

  it('si un enemigo golpea al jugador se anuncia la vida que le queda y cómo defenderse', async () => {
    const { emitir } = await montarLaberinto()

    emitir('golpe', { vida: 70 })

    expect(await screen.findByText(textos.laberinto.golpe(70))).toBeInTheDocument()
  })

  it('sin vida aparece game over y al reiniciar el servidor cierra los candados y la escena vuelve a empezar', async () => {
    localStorage.setItem(`codequest:borrador:${DESAFIO_PRUEBA.id}`, 'energia = 100')
    const { emitir, godot, fetch } = await montarLaberinto()
    emitir('escena_lista')

    emitir('game_over')
    await userEvent.click(await screen.findByRole('button', { name: textos.laberinto.reiniciar }))

    await waitFor(() =>
      expect(fetch.mock.calls.some(([url]) => String(url).endsWith(`/mundos/${LABERINTO_PRUEBA.id}/reiniciar/`))).toBe(true),
    )
    await waitFor(() => expect(godot.cargarLaberinto).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: textos.laberinto.reiniciar })).not.toBeInTheDocument()
    // Lo que había contestado en este laberinto se borra.
    expect(localStorage.getItem(`codequest:borrador:${DESAFIO_PRUEBA.id}`)).toBeNull()
  })

  it('la salida cerrada se anuncia con los obstáculos que faltan', async () => {
    const { emitir } = await montarLaberinto()

    emitir('salida_cerrada', { pendientes: 1 })

    expect(await screen.findByText(textos.laberinto.salidaCerrada(1))).toBeInTheDocument()
  })

  it('al llegar a la salida el servidor completa el mundo y ofrece ir al siguiente', async () => {
    const { emitir, fetch } = await montarLaberinto()

    emitir('salida')

    expect(await screen.findByRole('heading', { name: textos.laberinto.completadoTitulo })).toBeInTheDocument()
    expect(screen.getAllByText(textos.recompensa.puntos(25)).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: textos.laberinto.irAlSiguiente('El Bosque de las Decisiones') })).toHaveAttribute(
      'href',
      '/mundos/2',
    )
    await waitFor(() =>
      expect(fetch.mock.calls.some(([url]) => String(url).endsWith(`/mundos/${LABERINTO_PRUEBA.id}/completar/`))).toBe(true),
    )
  })
})
