// Matchers de Testing Library para Vitest (toBeInTheDocument, toHaveAccessibleName, ...).
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

import { SONIDO } from '../config/juego'
import { useNotificaciones } from '../estado/notificaciones'
import { useSonido } from '../estado/sonido'

// findBy*/waitFor esperan hasta 5 s (por defecto 1 s): ver testTimeout en vite.config.ts.
const ESPERA_ASINCRONA_MS = 5000
configure({ asyncUtilTimeout: ESPERA_ASINCRONA_MS })

// jsdom no implementa <dialog>.showModal/close: reemplazo mínimo SOLO para pruebas (los navegadores sí lo tienen).
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

// jsdom no reproduce audio (play() solo avisa "Not implemented"): reemplazo silencioso para pruebas.
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = () => Promise.resolve()
}

afterEach(() => {
  cleanup()
  useNotificaciones.setState({ avisos: [] })
  useSonido.setState({ volumen: SONIDO.volumenPorDefecto, silencio: false })
})
