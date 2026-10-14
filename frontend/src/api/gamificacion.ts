/** Endpoints de gamificación: catálogo de logros (ver /api/v1/docs/). */
import { solicitar } from './cliente'
import type { LogroDelUsuario } from './tipos'

export const obtenerLogros = () => solicitar<LogroDelUsuario[]>('/logros/')

/** Ruta pública del icono de un logro (el contenido guarda la ruta relativa a public/). */
export const urlIcono = (icono: string) => `${import.meta.env.BASE_URL}${icono}`
