/**
 * Laboratorio del motor (SOLO desarrollo): ejecuta código con el Worker real para verificar el
 * motor en el navegador. No existe en producción (ver router.tsx). El editor real llega en el paso 7.
 */
import { useEffect, useRef, useState } from 'react'

import { Boton } from '../componentes/ui/Boton'
import { Tarjeta } from '../componentes/ui/Tarjeta'
import { MOTOR } from '../config/juego'
import { EjecutorPython } from '../motor/EjecutorPython'
import type { ResultadoEjecucion } from '../motor/tipos'
import { traducirError } from '../motor/traductorErrores'
import estilos from './Paginas.module.css'

export function Laboratorio() {
  const ejecutor = useRef<EjecutorPython | null>(null)
  const [codigo, setCodigo] = useState('energia = 100\nnombre = "Ada"\nprint("Hola,", nombre)')
  const [resultado, setResultado] = useState<ResultadoEjecucion | null>(null)
  const [duracionMs, setDuracionMs] = useState<number | null>(null)
  const [ejecutando, setEjecutando] = useState(false)

  useEffect(() => {
    ejecutor.current = new EjecutorPython()
    return () => ejecutor.current?.destruir()
  }, [])

  async function ejecutar() {
    if (!ejecutor.current) return
    setEjecutando(true)
    const inicio = performance.now()
    const r = await ejecutor.current.ejecutar({
      codigo,
      limites: { salida: MOTOR.limiteSalida, acciones: MOTOR.limiteAcciones },
      funciones_juego: ['avanzar', 'saltar', 'atacar'],
    })
    setDuracionMs(Math.round(performance.now() - inicio))
    setResultado(r)
    setEjecutando(false)
  }

  const error = resultado?.error ? traducirError(resultado.error) : null

  return (
    <div className={estilos.panel}>
      <Tarjeta titulo="Laboratorio del motor (desarrollo)">
        <label htmlFor="codigo-lab">Código</label>
        <textarea
          id="codigo-lab"
          data-prueba="codigo"
          rows={10}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          style={{ width: '100%', fontFamily: 'var(--fuente-codigo)' }}
        />
        <Boton onClick={() => void ejecutar()} cargando={ejecutando} textoCargando="Ejecutando…">
          ▶ Ejecutar
        </Boton>
      </Tarjeta>
      <Tarjeta titulo="Resultado">
        {duracionMs !== null && <p data-prueba="duracion">Duración: {duracionMs} ms</p>}
        {error && (
          <div role="alert" data-prueba="error">
            <strong>{error.titulo}</strong>
            <p>{error.explicacion}</p>
            {error.sugerencia && <p>{error.sugerencia}</p>}
          </div>
        )}
        {resultado && (
          <>
            <pre data-prueba="salida">{resultado.salida}</pre>
            <pre data-prueba="variables">{JSON.stringify(resultado.variables, null, 2)}</pre>
            <pre data-prueba="acciones">{JSON.stringify(resultado.acciones.map((a) => a.tipo))}</pre>
          </>
        )}
      </Tarjeta>
    </div>
  )
}
