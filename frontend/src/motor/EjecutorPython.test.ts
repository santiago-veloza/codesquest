/** Pruebas del ejecutor con un Worker simulado y reloj falso (el Worker real se prueba en el navegador). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EjecutorPython, type TrabajadorMinimo } from './EjecutorPython'
import type { MensajeAlTrabajador, MensajeDelTrabajador } from './protocolo'
import type { ResultadoEjecucion } from './tipos'

const LIMITE_MS = 3000
const SOLICITUD = { codigo: 'print(1)', limites: { salida: 100, acciones: 10 } }
const RESULTADO: ResultadoEjecucion = { salida: '1\n', variables: {}, acciones: [], error: null, reglas: [] }

class TrabajadorFalso implements TrabajadorMinimo {
  onmessage: ((evento: MessageEvent<MensajeDelTrabajador>) => void) | null = null
  recibidos: MensajeAlTrabajador[] = []
  terminado = false
  postMessage(mensaje: MensajeAlTrabajador) {
    this.recibidos.push(mensaje)
  }
  terminate() {
    this.terminado = true
  }
  emitir(mensaje: MensajeDelTrabajador) {
    this.onmessage?.({ data: mensaje } as MessageEvent<MensajeDelTrabajador>)
  }
  responder(resultado = RESULTADO) {
    this.emitir({ tipo: 'resultado', id: this.recibidos.at(-1)!.id, resultado })
  }
}

let creados: TrabajadorFalso[]
const crear = () => {
  const t = new TrabajadorFalso()
  creados.push(t)
  return t
}

beforeEach(() => {
  vi.useFakeTimers()
  creados = []
})
afterEach(() => vi.useRealTimers())

describe('EjecutorPython', () => {
  it('espera a que Python esté listo y devuelve el resultado del Worker', async () => {
    const ejecutor = new EjecutorPython({ crearTrabajador: crear, limiteTiempoMs: LIMITE_MS })
    const promesa = ejecutor.ejecutar(SOLICITUD)
    creados[0]!.emitir({ tipo: 'listo' })
    await vi.advanceTimersByTimeAsync(0)
    creados[0]!.responder()

    await expect(promesa).resolves.toEqual(RESULTADO)
    expect(creados[0]!.recibidos[0]).toMatchObject({ tipo: 'ejecutar', solicitud: SOLICITUD })
  })

  it('si el código no termina a tiempo, termina el Worker, crea otro y avisa TiempoAgotado', async () => {
    const ejecutor = new EjecutorPython({ crearTrabajador: crear, limiteTiempoMs: LIMITE_MS })
    creados[0]!.emitir({ tipo: 'listo' })
    const promesa = ejecutor.ejecutar(SOLICITUD)

    await vi.advanceTimersByTimeAsync(LIMITE_MS)

    await expect(promesa).resolves.toMatchObject({ error: { tipo: 'TiempoAgotado' } })
    expect(creados[0]!.terminado).toBe(true)
    expect(creados).toHaveLength(2)
    expect(ejecutor.ocupado).toBe(false)
  })

  it('después de un tiempo agotado vuelve a ejecutar con el Worker nuevo', async () => {
    const ejecutor = new EjecutorPython({ crearTrabajador: crear, limiteTiempoMs: LIMITE_MS })
    creados[0]!.emitir({ tipo: 'listo' })
    const primera = ejecutor.ejecutar(SOLICITUD)
    await vi.advanceTimersByTimeAsync(LIMITE_MS)
    await primera

    const segunda = ejecutor.ejecutar(SOLICITUD)
    creados[1]!.emitir({ tipo: 'listo' })
    await vi.advanceTimersByTimeAsync(0)
    creados[1]!.responder()

    await expect(segunda).resolves.toEqual(RESULTADO)
  })

  it('una respuesta tardía del Worker anterior no se confunde con la nueva ejecución', async () => {
    const ejecutor = new EjecutorPython({ crearTrabajador: crear, limiteTiempoMs: LIMITE_MS })
    creados[0]!.emitir({ tipo: 'listo' })
    const promesa = ejecutor.ejecutar(SOLICITUD)
    await vi.advanceTimersByTimeAsync(0)
    creados[0]!.emitir({ tipo: 'resultado', id: 999, resultado: { ...RESULTADO, salida: 'viejo' } })
    creados[0]!.responder()

    await expect(promesa).resolves.toEqual(RESULTADO)
  })

  it('si Python no carga, informa CargaFallida', async () => {
    const ejecutor = new EjecutorPython({ crearTrabajador: crear })
    creados[0]!.emitir({ tipo: 'fallo_carga', mensaje: 'sin red' })

    await expect(ejecutor.ejecutar(SOLICITUD)).resolves.toMatchObject({ error: { tipo: 'CargaFallida' } })
  })

  it('si Python tarda demasiado en cargar, informa CargaFallida', async () => {
    const ejecutor = new EjecutorPython({ crearTrabajador: crear, limiteCargaMs: 1000 })
    const promesa = ejecutor.ejecutar(SOLICITUD)

    await vi.advanceTimersByTimeAsync(1000)

    await expect(promesa).resolves.toMatchObject({ error: { tipo: 'CargaFallida' } })
  })

  it('no permite dos ejecuciones a la vez (ni mientras Python carga)', async () => {
    const ejecutor = new EjecutorPython({ crearTrabajador: crear })
    void ejecutor.ejecutar(SOLICITUD)

    await expect(ejecutor.ejecutar(SOLICITUD)).rejects.toThrow(/en curso/)
  })
})
