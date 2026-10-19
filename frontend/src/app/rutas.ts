/** Rutas de la aplicación (sin textos sueltos en los componentes). */
export const RUTAS = {
  inicio: '/',
  ingresar: '/ingresar',
  registro: '/registro',
  privacidad: '/privacidad',
  mapa: '/mapa',
  logros: '/logros',
  mundo: '/mundos/:idMundo',
  desafio: '/desafios/:idDesafio',
} as const

export const rutaMundo = (id: number) => `/mundos/${id}`
export const rutaDesafio = (id: number) => `/desafios/${id}`

