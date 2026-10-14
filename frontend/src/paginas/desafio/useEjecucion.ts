/**
 * Estado de la ejecución de un desafío: preparar Python, ejecutar, evaluar y REGISTRAR el intento
 * en el servidor (que revalida y decide si el obstáculo queda resuelto).
 */
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { type RespuestaIntento, registrarIntento } from '../../api/progreso'
import type { DesafioDetalle } from '../../api/tipos'
import { PROGRESO } from '../../config/juego'
import { aplicarRecompensa } from '../../estado/recompensas'
import { type Veredicto, evaluarDesafio } from '../../motor/evaluador'
import { obtenerEjecutor } from '../../motor/ejecutorCompartido'
import { ERRORES_MOTOR } from '../../motor/tipos'

export type EstadoPython = 'preparando' | 'listo' | 'fallo'

function resultadoDe(veredicto: Veredicto) {
  return veredicto.estado
}

export function useEjecucion(desafio: DesafioDetalle | undefined) {
  const [estadoPython, setEstadoPython] = useState<EstadoPython>('preparando')
  const [ejecutando, setEjecutando] = useState(false)
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null)
  const [registro, setRegistro] = useState<RespuestaIntento | null>(null)
  const [falloRegistro, setFalloRegistro] = useState(false)
  const inicio = useRef(0)
  const clienteConsultas = useQueryClient()

  // Empieza a preparar Python apenas se abre el desafío, mientras el estudiante lee el enunciado.
  useEffect(() => {
    inicio.current = performance.now()
    let vigente = true
    void obtenerEjecutor()
      .esperarListo()
      .then((listo) => vigente && setEstadoPython(listo ? 'listo' : 'fallo'))
    return () => {
      vigente = false
    }
  }, [])

  async function ejecutar(codigo: string, pistasUsadas: number) {
    if (!desafio || ejecutando) return
    setEjecutando(true)
    setFalloRegistro(false)
    try {
      const evaluable = { pruebas: desafio.pruebas, variantes: desafio.variantes, funcionesJuego: desafio.funciones_juego }
      const nuevo = await evaluarDesafio(evaluable, codigo, obtenerEjecutor().ejecutar)
      setVeredicto(nuevo)
      // Un hueco sin completar ni siquiera se ejecutó: no cuenta como intento.
      if (nuevo.estado === 'error' && nuevo.error.tipoError === ERRORES_MOTOR.huecoSinCompletar) return
      try {
        const respuesta = await registrarIntento(desafio.id, {
          codigo_enviado: codigo,
          resultado: resultadoDe(nuevo),
          tipo_error: nuevo.estado === 'error' ? nuevo.error.tipoError : '',
          pistas_usadas: pistasUsadas,
          tiempo_ms: Math.min(Math.round(performance.now() - inicio.current), PROGRESO.tiempoMaximoIntentoMs),
        })
        setRegistro(respuesta)
        aplicarRecompensa(respuesta.recompensa, clienteConsultas)
      } catch {
        setFalloRegistro(true)
      }
    } finally {
      setEjecutando(false)
    }
  }

  return {
    estadoPython,
    ejecutando,
    veredicto,
    registro,
    falloRegistro,
    ejecutar,
    limpiar: () => setVeredicto(null),
  }
}
