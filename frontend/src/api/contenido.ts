/** Endpoints de contenido: mundos y desafíos (ver /api/v1/docs/). */
import { solicitar } from './cliente'
import type { DesafioDetalle, DesafioResumen, Mundo, MundoLaberinto } from './tipos'

export const obtenerMundos = () => solicitar<Mundo[]>('/mundos/')

export const obtenerMundo = (idMundo: number) => solicitar<MundoLaberinto>(`/mundos/${idMundo}/`)

export const obtenerDesafiosDeMundo = (idMundo: number) => solicitar<DesafioResumen[]>(`/mundos/${idMundo}/desafios/`)

export const obtenerDesafio = (idDesafio: number) => solicitar<DesafioDetalle>(`/desafios/${idDesafio}/`)
