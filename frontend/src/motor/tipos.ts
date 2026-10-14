/** Contrato entre el código TypeScript y el arnés de Python (motor/python/arnes.py). */

export type ValorSimple = string | number | boolean | null | ValorSimple[] | { [clave: string]: ValorSimple }

export interface SolicitudEjecucion {
  codigo: string
  /** Código Python (solo asignaciones literales) que crea las variables de la variante. */
  preparacion?: string
  /** Respuestas simuladas para input(). */
  entradas?: string[]
  funciones_juego?: string[]
  reglas?: ReglaEstructura[]
  limites: { salida: number; acciones: number }
}

export type ReglaEstructura =
  | { regla: 'usa_nodo'; nodo: string; mensaje: string }
  | { regla: 'min_funciones'; cantidad: number; mensaje: string }
  | { regla: 'prohibe_literal'; valor: number | string; mensaje: string }
  | { regla: 'usa_funcion'; nombre: string; mensaje: string }

export interface VariableCapturada {
  tipo: string
  valor: ValorSimple
  serializable: boolean
  repr: string
}

export interface AccionJuego {
  tipo: string
  argumentos: (string | number | boolean)[]
}

export interface ErrorPython {
  /** Nombre de la excepción (NameError...) o un error del motor: TiempoAgotado, CargaFallida. */
  tipo: string
  mensaje: string
  linea: number | null
  nombre?: string
  sugerencia?: string
  texto_linea?: string
}

export interface ResultadoRegla {
  regla: string
  cumple: boolean
  mensaje: string
}

export interface ResultadoEjecucion {
  salida: string
  variables: Record<string, VariableCapturada>
  acciones: AccionJuego[]
  error: ErrorPython | null
  reglas: ResultadoRegla[]
}

/** Cualquier cosa capaz de ejecutar una solicitud: el Worker en el navegador o Pyodide directo en pruebas. */
export type EjecutarFn = (solicitud: SolicitudEjecucion) => Promise<ResultadoEjecucion>

/** Errores que produce el motor (no Python) y que el traductor también explica. */
export const ERRORES_MOTOR = {
  tiempoAgotado: 'TiempoAgotado',
  cargaFallida: 'CargaFallida',
  huecoSinCompletar: 'HuecoSinCompletar',
} as const
