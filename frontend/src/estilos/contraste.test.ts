/**
 * Verifica automáticamente que los pares texto/fondo de los tokens cumplen WCAG AA.
 * Lee tokens.css directamente: si alguien cambia un color y rompe el contraste, la prueba falla.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const CONTRASTE_MINIMO_AA = 4.5
// Vitest no procesa CSS (un import ?raw llegaría vacío): se lee el archivo desde disco.
const css = readFileSync(resolve(process.cwd(), 'src/estilos/tokens.css'), 'utf8')

type Paleta = Record<string, string>

function leerBloque(selector: RegExp): Paleta {
  const paleta: Paleta = {}
  for (const bloque of css.matchAll(selector)) {
    for (const [, nombre, valor] of (bloque[1] ?? '').matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6});/gi)) {
      if (nombre && valor) paleta[nombre] = valor
    }
  }
  return paleta
}

const base = leerBloque(/:root\s*\{([^}]*)\}/g)
const mundos = [1, 2, 3, 4, 5].map((n) => ({
  n,
  paleta: { ...base, ...leerBloque(new RegExp(`\\[data-mundo='${n}'\\]\\s*\\{([^}]*)\\}`, 'g')) },
}))

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
  return (claro + 0.05) / (oscuro + 0.05)
}

function verificar(paleta: Paleta, pares: [string, string][]) {
  for (const [texto, fondo] of pares) {
    const colorTexto = paleta[texto]
    const colorFondo = paleta[fondo]
    expect(colorTexto, `falta el token --${texto}`).toBeDefined()
    expect(colorFondo, `falta el token --${fondo}`).toBeDefined()
    const ratio = contraste(colorTexto!, colorFondo!)
    expect(ratio, `--${texto} sobre --${fondo} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO_AA,
    )
  }
}

describe('contraste WCAG AA de los tokens', () => {
  it('la fórmula coincide con el caso conocido negro/blanco (21:1)', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('la paleta base cumple AA', () => {
    const superficies = ['color-fondo', 'color-superficie', 'color-superficie-alta']
    const textos = ['color-texto', 'color-texto-suave', 'color-primario', 'color-error', 'color-exito', 'color-aviso', 'color-acento']
    verificar(
      base,
      textos.flatMap((t) => superficies.map((s): [string, string] => [t, s])),
    )
    verificar(base, [['color-primario-texto', 'color-primario']])
  })

  it.each(mundos)('la paleta del mundo $n cumple AA', ({ paleta }) => {
    verificar(paleta, [
      ['color-texto', 'color-fondo'],
      ['color-texto', 'color-superficie'],
      ['color-primario', 'color-fondo'],
      ['color-primario', 'color-superficie'],
      ['color-acento', 'color-superficie'],
      ['color-primario-texto', 'color-primario'],
    ])
  })
})
