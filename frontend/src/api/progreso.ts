/** Endpoints de progreso: intentos y laberinto completado (ver /api/v1/docs/). */
import { solicitar } from './cliente'
import type { components } from './esquema'

export type DatosIntento = components['schemas']['IntentoEntradaRequest']
export type RespuestaIntento = components['schemas']['IntentoRespuesta']
export type RespuestaCompletarMundo = components['schemas']['CompletarMundoRespuesta']

export const registrarIntento = (idDesafio: number, datos: DatosIntento) =>
  solicitar<RespuestaIntento>(`/desafios/${idDesafio}/intentos/`, { metodo: 'POST', cuerpo: datos })

export type ProgresoMundo = components['schemas']['Progreso']

/** Game over: el laberinto vuelve a empezar con todos sus obstáculos. */
export const reiniciarMundo = (idMundo: number) =>
  solicitar<ProgresoMundo>(`/mundos/${idMundo}/reiniciar/`, { metodo: 'POST' })

export const completarMundo = (idMundo: number) =>
  solicitar<RespuestaCompletarMundo>(`/mundos/${idMundo}/completar/`, { metodo: 'POST' })
