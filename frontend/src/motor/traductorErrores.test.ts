import { describe, expect, it } from 'vitest'

import { traducirError } from './traductorErrores'
import type { ErrorPython } from './tipos'

const error = (tipo: string, extra: Partial<ErrorPython> = {}): ErrorPython => ({
  tipo,
  mensaje: '',
  linea: 3,
  ...extra,
})

describe('traductor de errores', () => {
  it.each([
    'SyntaxError',
    'IndentationError',
    'TabError',
    'NameError',
    'TypeError',
    'ZeroDivisionError',
    'ValueError',
    'EOFError',
    'IndexError',
    'KeyError',
    'AttributeError',
    'RecursionError',
    'ImportError',
    'SalidaExcesiva',
    'AccionesExcesivas',
    'TiempoAgotado',
    'HuecoSinCompletar',
    'CargaFallida',
  ])('%s tiene un mensaje propio, breve y en español', (tipo) => {
    const m = traducirError(error(tipo))

    expect(m.tipoError).toBe(tipo)
    expect(m.titulo).not.toMatch(/error \(/i)
    expect(m.explicacion.length).toBeGreaterThan(20)
    // "Una o dos frases": como máximo dos oraciones terminadas en punto.
    expect(m.explicacion.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 1).length).toBeLessThanOrEqual(3)
    expect(m.explicacion).not.toMatch(/Traceback|line \d|File "/)
  })

  it('indica la línea cuando se conoce', () => {
    expect(traducirError(error('ZeroDivisionError', { linea: 7 })).explicacion).toContain('línea 7')
  })

  it('no inventa una línea cuando no se conoce', () => {
    expect(traducirError(error('ZeroDivisionError', { linea: null })).explicacion).not.toContain('línea')
  })

  it('NameError menciona el nombre y sugiere el parecido', () => {
    const m = traducirError(error('NameError', { nombre: 'enrgia', sugerencia: 'energia' }))

    expect(m.explicacion).toContain('«enrgia»')
    expect(m.sugerencia).toBe('¿Quisiste decir «energia»?')
  })

  it('NameError sin parecidos no muestra sugerencia', () => {
    expect(traducirError(error('NameError', { nombre: 'zzz' })).sugerencia).toBeUndefined()
  })

  it('TypeError al unir texto y número explica str() e int()', () => {
    const m = traducirError(error('TypeError', { mensaje: 'can only concatenate str (not "int") to str' }))

    expect(m.explicacion).toMatch(/str\(\)/)
    expect(m.explicacion).toMatch(/int\(\)/)
  })

  it('el tiempo agotado se explica como posible bucle infinito', () => {
    expect(traducirError(error('TiempoAgotado', { linea: null })).explicacion).toMatch(/bucle infinito/)
  })

  it('un error desconocido recibe un mensaje genérico que nombra el tipo', () => {
    const m = traducirError(error('UnicodeDecodeError'))

    expect(m.tipoError).toBe('UnicodeDecodeError')
    expect(m.explicacion).toContain('UnicodeDecodeError')
  })
})
