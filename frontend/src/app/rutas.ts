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

export const CLAVES_CONSULTA = {
  perfil: ['perfil'],
  logros: ['logros'],
  mundos: ['mundos'],
  mundo: (idMundo: number) => ['mundos', idMundo] as const,
  desafiosDeMundo: (idMundo: number) => ['mundos', idMundo, 'desafios'] as const,
  desafio: (idDesafio: number) => ['desafios', idDesafio] as const,
} as const
