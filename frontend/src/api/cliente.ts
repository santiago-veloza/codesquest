/**
 * Cliente HTTP tipado para la API de CODEQUEST.
 * - Agrega el access token (en memoria) a cada petición autenticada.
 * - Si el servidor responde 401, renueva la sesión UNA vez con la cookie HttpOnly y reintenta.
 * - Convierte cualquier error al tipo ErrorApi con el formato uniforme del backend.
 */
import { useSesion } from '../estado/sesion'
import { textos } from '../textos/es'
import type { Access, CuerpoError } from './tipos'

export const BASE_API = '/api/v1'
// Cabecera anti-CSRF que exige el backend en refresh/logout (ADR-0003).
export const CABECERA_CLIENTE = { 'X-CodeQuest-Cliente': 'web' } as const
const ESTADO_SIN_CONEXION = 0
const ESTADO_NO_AUTORIZADO = 401
const ESTADO_SIN_CONTENIDO = 204

export class ErrorApi extends Error {
  readonly estado: number
  readonly codigo: string
  readonly detalles: Record<string, string[]>

  constructor(estado: number, codigo: string, mensaje: string, detalles: Record<string, string[]> = {}) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
    this.detalles = detalles
  }
}

type Metodo = 'GET' | 'POST' | 'PATCH'

export interface OpcionesSolicitud {
  metodo?: Metodo
  cuerpo?: unknown
  /** false en login/registro/logout: no envía access ni intenta renovar la sesión. */
  autenticada?: boolean
  cabeceras?: Record<string, string>
}

export async function solicitar<T>(ruta: string, opciones: OpcionesSolicitud = {}): Promise<T> {
  const autenticada = opciones.autenticada ?? true
  const respuesta = await enviar(ruta, opciones, autenticada)
  if (respuesta.status === ESTADO_NO_AUTORIZADO && autenticada && (await renovarSesion())) {
    return interpretar<T>(await enviar(ruta, opciones, autenticada))
  }
  return interpretar<T>(respuesta)
}

async function enviar(ruta: string, opciones: OpcionesSolicitud, autenticada: boolean): Promise<Response> {
  const cabeceras: Record<string, string> = { Accept: 'application/json', ...opciones.cabeceras }
  if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  const access = useSesion.getState().access
  if (autenticada && access) cabeceras.Authorization = `Bearer ${access}`
  try {
    return await fetch(`${BASE_API}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      credentials: 'same-origin',
    })
  } catch {
    throw new ErrorApi(ESTADO_SIN_CONEXION, 'sin_conexion', textos.errores.sinConexion)
  }
}

async function interpretar<T>(respuesta: Response): Promise<T> {
  if (respuesta.status === ESTADO_SIN_CONTENIDO) return undefined as T
  const datos: unknown = await respuesta.json().catch(() => null)
  if (respuesta.ok) return datos as T
  throw aErrorApi(respuesta.status, datos)
}

function aErrorApi(estado: number, datos: unknown): ErrorApi {
  if (esCuerpoError(datos)) {
    const { codigo, mensaje, detalles } = datos.error
    return new ErrorApi(estado, codigo, textos.errores.porCodigo[codigo] ?? mensaje, detalles)
  }
  return new ErrorApi(estado, 'error_desconocido', textos.estados.errorGenerico)
}

function esCuerpoError(datos: unknown): datos is CuerpoError {
  if (typeof datos !== 'object' || datos === null || !('error' in datos)) return false
  const error = (datos as { error: unknown }).error
  return typeof error === 'object' && error !== null && 'codigo' in error && 'mensaje' in error
}

// Una sola renovación a la vez: si varias peticiones reciben 401 juntas (o React StrictMode monta
// dos veces), todas esperan la misma. Dos refresh simultáneos con rotación harían fallar uno.
let renovacionEnCurso: Promise<boolean> | null = null

export function renovarSesion(): Promise<boolean> {
  renovacionEnCurso ??= ejecutarRenovacion().finally(() => {
    renovacionEnCurso = null
  })
  return renovacionEnCurso
}

async function ejecutarRenovacion(): Promise<boolean> {
  try {
    const respuesta = await fetch(`${BASE_API}/auth/refresh/`, {
      method: 'POST',
      headers: { ...CABECERA_CLIENTE, Accept: 'application/json' },
      credentials: 'same-origin',
    })
    if (!respuesta.ok) {
      useSesion.getState().cerrar()
      return false
    }
    const { access } = (await respuesta.json()) as Access
    useSesion.getState().ponerAccess(access)
    return true
  } catch {
    // Sin conexión no se cierra la sesión: puede ser un corte momentáneo.
    return false
  }
}
