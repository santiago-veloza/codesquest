/** Utilidades de prueba: respuestas HTTP simuladas y montaje de la app en una ruta. */
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { vi } from 'vitest'

import type { DesafioDetalle, LogroDelUsuario, Mundo, MundoLaberinto, Perfil, Recompensa } from '../api/tipos'
import { crearClienteConsultas } from '../app/clienteConsultas'
import { rutas } from '../app/router'
import { type EstadoSesion, useSesion } from '../estado/sesion'

export const PERFIL_PRUEBA: Perfil = {
  email: 'ada@correo.com',
  rol: 'estudiante',
  fecha_registro: '2026-10-05T00:00:00-05:00',
  apodo: 'Ada',
  avatar: 'pixel',
  experiencia: 0,
  puntos: 0,
  nivel: 1,
  experiencia_nivel_actual: 0,
  experiencia_siguiente_nivel: 24,
  energia: 100,
}

export const MUNDOS_PRUEBA: Mundo[] = [
  { id: 1, codigo: 'mundo_1', orden: 1, nombre: 'La Ciudad de las Variables', conceptos: 'Variables', descripcion: 'Ciudad', estado: 'desbloqueado', porcentaje: 0 },
  { id: 2, codigo: 'mundo_2', orden: 2, nombre: 'El Bosque de las Decisiones', conceptos: 'Condicionales', descripcion: 'Bosque', estado: 'bloqueado', porcentaje: 0 },
]

export const DESAFIO_PRUEBA: DesafioDetalle = {
  id: 7,
  codigo: '1.1',
  orden: 1,
  titulo: 'La primera caja',
  dificultad: 'basico',
  enunciado: 'Guarda 100 en energia.',
  codigo_base: 'energia = ______',
  pistas: ['Pista uno', 'Pista dos', 'Pista tres'],
  pruebas: [{ tipo: 'variables', variables: { energia: { valor: 100, tipo: 'int' } } }],
  variantes: [],
  xp_base: 10,
  mundo: { id: 1, codigo: 'mundo_1', orden: 1 },
  funciones_juego: [],
}

export const LABERINTO_PRUEBA: MundoLaberinto = {
  ...MUNDOS_PRUEBA[0]!,
  mapa: ['wwwwwww', 'wa1c2sw', 'wwwwwww'],
  obstaculos: [
    { simbolo: '1', desafio_id: DESAFIO_PRUEBA.id, codigo: '1.1', titulo: 'La primera caja', dificultad: 'basico', resuelto: false },
    { simbolo: '2', desafio_id: 8, codigo: '1.2', titulo: 'Tipos de datos', dificultad: 'basico', resuelto: true },
  ],
}

export const LOGRO_PRIMER_CODIGO = {
  codigo: 'primer_codigo',
  nombre: 'Primer Código',
  descripcion: 'Resolviste tu primer desafío.',
  icono: 'img/logros/logro_primer_codigo.png',
}

/** Primer acierto (10 XP base + 5 de bonus): no alcanza el nivel 2 (umbral 24). */
export const RECOMPENSA_PRIMER_ACIERTO: Recompensa = {
  xp_otorgada: 15,
  puntos_otorgados: 15,
  experiencia: 15,
  puntos: 15,
  nivel: 1,
  subio_de_nivel: false,
  logros_nuevos: [LOGRO_PRIMER_CODIGO],
  experiencia_nivel_actual: 0,
  experiencia_siguiente_nivel: 24,
}

export const RECOMPENSA_MUNDO: Recompensa = {
  ...RECOMPENSA_PRIMER_ACIERTO,
  xp_otorgada: 0,
  puntos_otorgados: 25,
  puntos: 40,
  logros_nuevos: [],
}

export const RESPUESTA_INTENTO_RESUELTO = {
  resultado: 'correcto',
  desafio_resuelto: true,
  xp_otorgada: 15,
  progreso: { estado: 'desbloqueado', porcentaje: 100, desafios_completados: 2, total_desafios: 2 },
  recompensa: RECOMPENSA_PRIMER_ACIERTO,
}

export const LOGROS_PRUEBA: LogroDelUsuario[] = [
  { ...LOGRO_PRIMER_CODIGO, obtenido: true, fecha_obtencion: '2026-10-14T10:00:00-05:00' },
  {
    codigo: 'sin_pistas',
    nombre: 'Sin Pistas',
    descripcion: 'Completaste un mundo entero sin usar ninguna pista.',
    icono: 'img/logros/logro_sin_pistas.png',
    obtenido: false,
    fecha_obtencion: null,
  },
]

/** Respuestas por defecto de la API para una sesión autenticada (perfil, mundos, laberinto, desafíos). */
export function respuestaApiJuego(url: string): Response {
  if (url.endsWith('/perfil/')) return respuestaJson(200, PERFIL_PRUEBA)
  if (url.endsWith('/mundos/')) return respuestaJson(200, MUNDOS_PRUEBA)
  if (/\/mundos\/\d+\/$/.test(url)) return respuestaJson(200, LABERINTO_PRUEBA)
  if (/\/mundos\/\d+\/completar\/$/.test(url)) return respuestaJson(200, { siguiente_mundo: { id: 2, nombre: 'El Bosque de las Decisiones' }, recompensa: RECOMPENSA_MUNDO })
  if (/\/mundos\/\d+\/reiniciar\/$/.test(url))
    return respuestaJson(200, { estado: 'desbloqueado', porcentaje: 0, desafios_completados: 0, total_desafios: 2 })
  if (/\/desafios\/\d+\/intentos\/$/.test(url)) return respuestaJson(201, RESPUESTA_INTENTO_RESUELTO)
  if (/\/mundos\/\d+\/desafios\/$/.test(url)) return respuestaJson(200, [DESAFIO_PRUEBA])
  if (/\/desafios\/\d+\/$/.test(url)) return respuestaJson(200, DESAFIO_PRUEBA)
  if (url.endsWith('/logros/')) return respuestaJson(200, LOGROS_PRUEBA)
  return respuestaJson(404, { error: { codigo: 'no_encontrado', mensaje: 'No existe.' } })
}

export function respuestaJson(estado: number, cuerpo?: unknown): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function cuerpoError(codigo: string, mensaje = 'mensaje del servidor', detalles?: Record<string, string[]>) {
  return { error: { codigo, mensaje, ...(detalles ? { detalles } : {}) } }
}

type Manejador = (url: string, init: RequestInit) => Response | Promise<Response>

/** Reemplaza fetch global; el manejador decide la respuesta según la URL. */
export function simularFetch(manejador: Manejador) {
  const espia = vi.fn((url: RequestInfo | URL, init: RequestInit = {}) => Promise.resolve(manejador(String(url), init)))
  vi.stubGlobal('fetch', espia)
  return espia
}

export function prepararSesion(estado: EstadoSesion, perfil: Perfil | null = null) {
  useSesion.setState({
    estado,
    access: estado === 'autenticada' ? 'access-prueba' : null,
    perfil,
    motivoCierre: null,
  })
}

export function montarEn(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
