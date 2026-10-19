/**
 * Pyodide para pruebas en Node (golden tests y pruebas del arnés). Se carga una sola vez por
 * archivo de prueba desde node_modules: es exactamente la versión que se sirve al navegador.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { loadPyodide } from 'pyodide'

import { prepararArnes } from '../motor/arnesPyodide'
import type { EjecutarFn } from '../motor/tipos'

export const TIEMPO_CARGA_PYODIDE_MS = 60_000

// En Node se leen los .py desde disco (Vitest no siempre aplica ?raw fuera del navegador).
const FUENTES = ['../backend/compartido/python/reglas_estructura.py', 'src/motor/python/arnes.py']

export async function crearEjecutorNode(): Promise<EjecutarFn> {
  const pyodide = await loadPyodide()
  const fuentes = FUENTES.map((ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8'))
  const ejecutar = prepararArnes(pyodide, fuentes)
  return (solicitud) => Promise.resolve(ejecutar(solicitud))
}
