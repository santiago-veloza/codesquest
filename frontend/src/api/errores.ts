import { textos } from '../textos/es'
import { ErrorApi } from './cliente'

/** Errores de un campo concreto (los "detalles" que devuelve el backend en un 400). */
export function erroresDeCampo(error: unknown, campo: string): string[] | undefined {
  return error instanceof ErrorApi ? error.detalles[campo] : undefined
}

/** Mensaje general para mostrar arriba del formulario (si el error no es solo de campos). */
export function mensajeGeneral(error: unknown, campos: readonly string[]): string | null {
  if (!error) return null
  if (!(error instanceof ErrorApi)) return textos.estados.errorGenerico
  const soloDeCampos = Object.keys(error.detalles).length > 0 && Object.keys(error.detalles).every((c) => campos.includes(c))
  return soloDeCampos ? null : error.message
}
