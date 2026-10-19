// @vitest-environment node
/**
 * Golden tests del contenido: para CADA desafío de content/mundos/*.json,
 *  - la solución de referencia pasa todas las pruebas y variantes;
 *  - cada error típico falla.
 * Se ejecutan con el mismo Pyodide y el mismo evaluador que usa el navegador.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { TIEMPO_CARGA_PYODIDE_MS, crearEjecutorNode } from '../pruebas/pyodideNode'
import { type DesafioEvaluable, type Prueba, type Variante, evaluarDesafio } from './evaluador'
import type { EjecutarFn } from './tipos'

interface DesafioContenido {
  codigo: string
  titulo: string
  pruebas: Prueba[]
  variantes?: Variante[]
  solucion_referencia: string
  errores_tipicos: { descripcion: string; codigo: string }[]
}

interface MundoContenido {
  codigo: string
  funciones_juego?: string[]
  desafios: DesafioContenido[]
}

const CARPETA_MUNDOS = resolve(process.cwd(), '../backend/content/mundos')
const mundos: MundoContenido[] = readdirSync(CARPETA_MUNDOS)
  .filter((archivo) => archivo.endsWith('.json'))
  .map((archivo) => JSON.parse(readFileSync(resolve(CARPETA_MUNDOS, archivo), 'utf8')) as MundoContenido)

const desafios = mundos.flatMap((mundo) =>
  mundo.desafios.map((d) => ({
    ...d,
    evaluable: { pruebas: d.pruebas, variantes: d.variantes, funcionesJuego: mundo.funciones_juego } as DesafioEvaluable,
  })),
)

let ejecutar: EjecutarFn
beforeAll(async () => {
  ejecutar = await crearEjecutorNode()
}, TIEMPO_CARGA_PYODIDE_MS)

it('hay contenido que probar', () => {
  expect(desafios.length).toBeGreaterThan(0)
})

describe.each(desafios)('desafío $codigo — $titulo', (desafio) => {
  it('la solución de referencia pasa', async () => {
    const veredicto = await evaluarDesafio(desafio.evaluable, desafio.solucion_referencia, ejecutar)

    expect(veredicto, JSON.stringify(veredicto.estado === 'correcto' ? {} : veredicto, null, 2)).toMatchObject({
      estado: 'correcto',
    })
  })

  it.each(desafio.errores_tipicos)('el error típico "$descripcion" falla', async ({ codigo }) => {
    const veredicto = await evaluarDesafio(desafio.evaluable, codigo, ejecutar)

    expect(veredicto.estado).not.toBe('correcto')
  })
})
