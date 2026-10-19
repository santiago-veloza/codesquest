/** Claves de caché de TanStack Query: una por recurso de la API (capa de datos). */
export const CLAVES_CONSULTA = {
  perfil: ['perfil'],
  logros: ['logros'],
  mundos: ['mundos'],
  mundo: (idMundo: number) => ['mundos', idMundo] as const,
  desafiosDeMundo: (idMundo: number) => ['mundos', idMundo, 'desafios'] as const,
  desafio: (idDesafio: number) => ['desafios', idDesafio] as const,
} as const
