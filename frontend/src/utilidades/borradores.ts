/**
 * Borradores del código de cada desafío, guardados en este navegador como comodidad.
 * Se borran al ingresar, registrarse o cerrar sesión: en un computador compartido (p. ej. la sala
 * de sistemas) la siguiente persona no debe ver el código, ni las respuestas, de la anterior.
 */
import { borrarConPrefijo, borrarLocal, guardarLocal, leerLocal } from './almacenamientoLocal'

const PREFIJO = 'borrador:'
const clave = (idDesafio: number) => `${PREFIJO}${idDesafio}`

export const leerBorrador = (idDesafio: number) => leerLocal(clave(idDesafio))
export const guardarBorrador = (idDesafio: number, codigo: string) => guardarLocal(clave(idDesafio), codigo)
export const borrarBorrador = (idDesafio: number) => borrarLocal(clave(idDesafio))
export const borrarTodosLosBorradores = () => borrarConPrefijo(PREFIJO)
