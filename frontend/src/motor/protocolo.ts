/** Mensajes entre el hilo principal (EjecutorPython) y el Web Worker (trabajadorPython). */
import type { ResultadoEjecucion, SolicitudEjecucion } from './tipos'

export type MensajeAlTrabajador = { tipo: 'ejecutar'; id: number; solicitud: SolicitudEjecucion }

export type MensajeDelTrabajador =
  | { tipo: 'listo' }
  | { tipo: 'fallo_carga'; mensaje: string }
  | { tipo: 'resultado'; id: number; resultado: ResultadoEjecucion }

/** Resultado sintético para errores del motor (tiempo agotado, carga fallida...). */
export function resultadoConError(tipo: string, mensaje = ''): ResultadoEjecucion {
  return { salida: '', variables: {}, acciones: [], reglas: [], error: { tipo, mensaje, linea: null } }
}
