/**
 * Un solo EjecutorPython para toda la app: Python (~12 MB) se descarga y prepara una vez y se
 * reutiliza entre desafíos. Se crea al primer uso (al entrar a un desafío), no al abrir la app.
 */
import { EjecutorPython } from './EjecutorPython'

let ejecutor: EjecutorPython | null = null

export function obtenerEjecutor(): EjecutorPython {
  ejecutor ??= new EjecutorPython()
  return ejecutor
}
