import { beforeEach, describe, expect, it } from 'vitest'

import { SONIDO } from '../config/juego'
import { leerPreferencia, useSonido } from './sonido'

const CLAVE = 'codequest:sonido'

beforeEach(() => localStorage.clear())

describe('preferencia de sonido', () => {
  it('sin nada guardado usa el volumen por defecto y con sonido', () => {
    expect(leerPreferencia()).toEqual({ volumen: SONIDO.volumenPorDefecto, silencio: false })
  })

  it('lee lo guardado y acota el volumen', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ volumen: 5, silencio: true }))

    expect(leerPreferencia()).toEqual({ volumen: 1, silencio: true })
  })

  it('un valor guardado corrupto no rompe nada', () => {
    localStorage.setItem(CLAVE, '{no es json')

    expect(leerPreferencia().volumen).toBe(SONIDO.volumenPorDefecto)
  })

  it('cambiar el volumen se recuerda y subirlo quita el silencio', () => {
    useSonido.getState().alternarSilencio()
    useSonido.getState().ponerVolumen(0.3)

    expect(useSonido.getState()).toMatchObject({ volumen: 0.3, silencio: false })
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual({ volumen: 0.3, silencio: false })
  })

  it('bajar el volumen a cero equivale a silenciar', () => {
    useSonido.getState().ponerVolumen(0)

    expect(useSonido.getState().silencio).toBe(true)
  })
})
