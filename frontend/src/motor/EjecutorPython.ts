/**
 * Ejecutor del hilo principal: administra el Web Worker de Python.
 * - Espera a que Pyodide esté listo (con límite de tiempo de carga).
 * - Ejecuta una solicitud a la vez con límite de tiempo (3 s).
 * - Si el código no termina, TERMINA el Worker a la fuerza y crea uno nuevo: la página nunca se
 *   congela, aunque el estudiante escriba un bucle infinito.
 */
import { MOTOR } from '../config/juego'
import { type MensajeAlTrabajador, type MensajeDelTrabajador, resultadoConError } from './protocolo'
import { ERRORES_MOTOR, type EjecutarFn, type ResultadoEjecucion, type SolicitudEjecucion } from './tipos'

export interface TrabajadorMinimo {
  postMessage: (mensaje: MensajeAlTrabajador) => void
  terminate: () => void
  onmessage: ((evento: MessageEvent<MensajeDelTrabajador>) => void) | null
}

export interface OpcionesEjecutor {
  crearTrabajador?: () => TrabajadorMinimo
  limiteTiempoMs?: number
  limiteCargaMs?: number
}

const crearTrabajadorReal = (): TrabajadorMinimo =>
  new Worker(new URL('./trabajadorPython.ts', import.meta.url), { type: 'module', name: 'python' })

interface EjecucionEnCurso {
  id: number
  terminar: (resultado: ResultadoEjecucion) => void
}

export class EjecutorPython {
  private readonly crearTrabajador: () => TrabajadorMinimo
  private readonly limiteTiempoMs: number
  private readonly limiteCargaMs: number
  private trabajador!: TrabajadorMinimo
  private listo!: Promise<void>
  private enCurso: EjecucionEnCurso | null = null
  private reservado = false
  private siguienteId = 1

  constructor(opciones: OpcionesEjecutor = {}) {
    this.crearTrabajador = opciones.crearTrabajador ?? crearTrabajadorReal
    this.limiteTiempoMs = opciones.limiteTiempoMs ?? MOTOR.limiteTiempoMs
    this.limiteCargaMs = opciones.limiteCargaMs ?? MOTOR.limiteCargaMs
    this.iniciar()
  }

  /** Para pasar al evaluador: `evaluarDesafio(desafio, codigo, ejecutor.ejecutar)`. */
  readonly ejecutar: EjecutarFn = async (solicitud) => {
    // Se marca antes de esperar la carga: dos clics seguidos no deben lanzar dos ejecuciones.
    if (this.reservado) throw new Error('Ya hay una ejecución en curso.')
    this.reservado = true
    try {
      try {
        await this.listo
      } catch (error) {
        return resultadoConError(ERRORES_MOTOR.cargaFallida, String(error))
      }
      return await this.enviar(solicitud)
    } finally {
      this.reservado = false
    }
  }

  get ocupado(): boolean {
    return this.reservado
  }

  /** Se resuelve en true cuando Python está listo, o false si no pudo cargarse. */
  esperarListo(): Promise<boolean> {
    return this.listo.then(
      () => true,
      () => false,
    )
  }

  destruir(): void {
    this.trabajador.terminate()
  }

  private iniciar(): void {
    this.trabajador = this.crearTrabajador()
    this.listo = new Promise<void>((resolver, rechazar) => {
      const temporizador = setTimeout(() => rechazar(new Error('Python tardó demasiado en cargar.')), this.limiteCargaMs)
      this.trabajador.onmessage = ({ data }) => {
        if (data.tipo === 'listo') {
          clearTimeout(temporizador)
          resolver()
        } else if (data.tipo === 'fallo_carga') {
          clearTimeout(temporizador)
          rechazar(new Error(data.mensaje))
        } else if (data.tipo === 'resultado' && data.id === this.enCurso?.id) {
          this.enCurso.terminar(data.resultado)
        }
      }
    })
    // Evita "unhandled rejection": el error se informa al ejecutar.
    this.listo.catch(() => undefined)
  }

  private enviar(solicitud: SolicitudEjecucion): Promise<ResultadoEjecucion> {
    return new Promise((resolver) => {
      const id = this.siguienteId++
      const temporizador = setTimeout(() => {
        // El código no terminó: se descarta el Worker (y su Python) y se prepara uno nuevo.
        this.trabajador.terminate()
        this.enCurso = null
        this.iniciar()
        resolver(resultadoConError(ERRORES_MOTOR.tiempoAgotado))
      }, this.limiteTiempoMs)

      this.enCurso = {
        id,
        terminar: (resultado) => {
          clearTimeout(temporizador)
          this.enCurso = null
          resolver(resultado)
        },
      }
      this.trabajador.postMessage({ tipo: 'ejecutar', id, solicitud })
    })
  }
}
