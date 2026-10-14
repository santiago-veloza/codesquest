import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSonido } from '../estado/sonido'
import { reproducirEfecto } from './efectos'

const play = vi.fn(() => Promise.resolve())
const creados: { src: string; volume: number }[] = []

class AudioFalso {
  volume = 1
  src: string
  play: () => Promise<void> = play
  constructor(src: string) {
    this.src = src
    creados.push(this)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  creados.length = 0
  play.mockClear()
})

describe('reproducirEfecto', () => {
  it('reproduce el archivo del efecto con el volumen elegido', () => {
    vi.stubGlobal('Audio', AudioFalso)
    useSonido.setState({ volumen: 0.4, silencio: false })

    reproducirEfecto('logro')

    expect(creados[0]).toMatchObject({ src: '/sonidos/sfx_gem.ogg', volume: 0.4 })
    expect(play).toHaveBeenCalled()
  })

  it('en silencio no suena nada', () => {
    vi.stubGlobal('Audio', AudioFalso)
    useSonido.setState({ silencio: true })

    reproducirEfecto('acierto')

    expect(creados).toHaveLength(0)
  })

  it('si el navegador rechaza el audio no lanza errores', () => {
    vi.stubGlobal('Audio', class extends AudioFalso { override play = () => Promise.reject(new Error('bloqueado')) })

    expect(() => reproducirEfecto('nivel')).not.toThrow()
  })
})
