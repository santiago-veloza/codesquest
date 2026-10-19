import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Perfil } from '../api/tipos'
import { CLAVES_CONSULTA } from '../api/clavesConsulta'
import { PERFIL_PRUEBA, RECOMPENSA_MUNDO, RECOMPENSA_PRIMER_ACIERTO, prepararSesion } from '../pruebas/utilidades'
import { textos } from '../textos/es'
import { useNotificaciones } from './notificaciones'
import { aplicarRecompensa, avisosDe, efectoDe } from './recompensas'
import { useSesion } from './sesion'

beforeEach(() => prepararSesion('autenticada', PERFIL_PRUEBA))

describe('avisosDe', () => {
  it('anuncia la XP y cada logro nuevo con su icono', () => {
    expect(avisosDe(RECOMPENSA_PRIMER_ACIERTO)).toEqual([
      { tipo: 'xp', texto: textos.recompensa.xp(15) },
      { tipo: 'logro', texto: textos.recompensa.logro('Primer Código'), icono: '/img/logros/logro_primer_codigo.png' },
    ])
  })

  it('anuncia la subida de nivel', () => {
    const avisos = avisosDe({ ...RECOMPENSA_PRIMER_ACIERTO, nivel: 2, subio_de_nivel: true, logros_nuevos: [] })

    expect(avisos.map((a) => a.texto)).toEqual([textos.recompensa.xp(15), textos.recompensa.subioDeNivel(2)])
  })

  it('el bonus de completar un mundo se anuncia como puntos', () => {
    expect(avisosDe(RECOMPENSA_MUNDO)).toEqual([{ tipo: 'xp', texto: textos.recompensa.puntos(25) }])
  })

  it('sin recompensa no hay avisos', () => {
    expect(avisosDe({ ...RECOMPENSA_MUNDO, puntos_otorgados: 0 })).toEqual([])
  })
})

describe('efectoDe', () => {
  it('suena un solo efecto, el más importante', () => {
    expect(efectoDe(RECOMPENSA_PRIMER_ACIERTO)).toBe('logro')
    expect(efectoDe({ ...RECOMPENSA_PRIMER_ACIERTO, logros_nuevos: [], subio_de_nivel: true })).toBe('nivel')
    expect(efectoDe({ ...RECOMPENSA_PRIMER_ACIERTO, logros_nuevos: [] })).toBe('acierto')
    expect(efectoDe({ ...RECOMPENSA_MUNDO, puntos_otorgados: 0 })).toBeNull()
  })
})

describe('aplicarRecompensa', () => {
  it('actualiza el perfil en memoria y en la caché, y encola los avisos', () => {
    const cliente = new QueryClient()
    cliente.setQueryData(CLAVES_CONSULTA.perfil, PERFIL_PRUEBA)

    aplicarRecompensa(RECOMPENSA_PRIMER_ACIERTO, cliente)

    const esperado = { experiencia: 15, puntos: 15, nivel: 1, experiencia_siguiente_nivel: 24 }
    expect(useSesion.getState().perfil).toMatchObject(esperado)
    expect(cliente.getQueryData<Perfil>(CLAVES_CONSULTA.perfil)).toMatchObject(esperado)
    expect(useNotificaciones.getState().avisos).toHaveLength(2)
  })
})
