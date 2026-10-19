/**
 * Prepara el arnés de Python dentro de una instancia de Pyodide y devuelve una función para
 * ejecutar solicitudes. Lo usan el Worker (navegador) y los golden tests (Node): mismo código.
 */
import type { PyodideAPI } from 'pyodide'

// Fuente única de las reglas AST: también la usa el servidor para revalidar sin ejecutar código.
import fuenteReglas from '../../../backend/compartido/python/reglas_estructura.py?raw'
import fuenteArnes from './python/arnes.py?raw'
import type { ResultadoEjecucion, SolicitudEjecucion } from './tipos'

export function prepararArnes(pyodide: PyodideAPI, fuentes: string[] = [fuenteReglas, fuenteArnes]) {
  for (const fuente of fuentes) pyodide.runPython(fuente)
  const ejecutarSolicitud = pyodide.globals.get('ejecutar_solicitud') as (json: string) => string

  return (solicitud: SolicitudEjecucion): ResultadoEjecucion =>
    JSON.parse(ejecutarSolicitud(JSON.stringify(solicitud))) as ResultadoEjecucion
}
