/**
 * Web Worker que ejecuta el código del estudiante con Pyodide. Corre fuera del hilo de la interfaz:
 * un bucle infinito no congela la página, y el hilo principal puede terminarlo a la fuerza.
 * Pyodide se sirve desde nuestro propio servidor (public/pyodide), nunca desde un CDN.
 */
import type { PyodideAPI } from 'pyodide'

import { prepararArnes } from './arnesPyodide'
import { type MensajeAlTrabajador, type MensajeDelTrabajador, resultadoConError } from './protocolo'

interface AmbitoTrabajador {
  location: { origin: string }
  postMessage: (mensaje: MensajeDelTrabajador) => void
  onmessage: ((evento: MessageEvent<MensajeAlTrabajador>) => void) | null
}

const ambito = self as unknown as AmbitoTrabajador
const RUTA_PYODIDE = new URL(`${import.meta.env.BASE_URL}pyodide/`, ambito.location.origin).href

async function cargarArnes() {
  // Import dinámico de la copia local (no se empaqueta con Vite: la versión debe coincidir con el .wasm).
  const modulo = (await import(/* @vite-ignore */ `${RUTA_PYODIDE}pyodide.mjs`)) as {
    loadPyodide: (opciones: { indexURL: string }) => Promise<PyodideAPI>
  }
  const pyodide = await modulo.loadPyodide({ indexURL: RUTA_PYODIDE })
  return prepararArnes(pyodide)
}

const arnes = cargarArnes()
arnes.then(
  () => ambito.postMessage({ tipo: 'listo' }),
  (error: unknown) => ambito.postMessage({ tipo: 'fallo_carga', mensaje: String(error) }),
)

ambito.onmessage = async ({ data }) => {
  const ejecutar = await arnes
  try {
    ambito.postMessage({ tipo: 'resultado', id: data.id, resultado: ejecutar(data.solicitud) })
  } catch (error) {
    // Solo llega aquí si falla el propio arnés (no el código del estudiante, que se captura en Python).
    ambito.postMessage({ tipo: 'resultado', id: data.id, resultado: resultadoConError('ErrorInterno', String(error)) })
  }
}
