/** Endpoints de autenticación y perfil (ver /api/v1/docs/). */
import { CABECERA_CLIENTE, solicitar } from './cliente'
import type { CambiosPerfil, DatosIngreso, DatosRegistro, Perfil, Sesion } from './tipos'

export function registrar(datos: DatosRegistro): Promise<Sesion> {
  return solicitar<Sesion>('/auth/registro/', { metodo: 'POST', cuerpo: datos, autenticada: false })
}

export function ingresar(datos: DatosIngreso): Promise<Sesion> {
  return solicitar<Sesion>('/auth/login/', { metodo: 'POST', cuerpo: datos, autenticada: false })
}

export function cerrarSesion(): Promise<void> {
  return solicitar<void>('/auth/logout/', { metodo: 'POST', autenticada: false, cabeceras: CABECERA_CLIENTE })
}

export function obtenerPerfil(): Promise<Perfil> {
  return solicitar<Perfil>('/perfil/')
}

export function actualizarPerfil(cambios: CambiosPerfil): Promise<Perfil> {
  return solicitar<Perfil>('/perfil/', { metodo: 'PATCH', cuerpo: cambios })
}
