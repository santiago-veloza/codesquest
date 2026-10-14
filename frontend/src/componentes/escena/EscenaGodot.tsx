/**
 * Incrusta la escena de Godot (exportación web en /juego/) y la conecta con React.
 * Contrato (game/scripts/web/puente_web.gd):
 *   React -> Godot: window.codequestGodot.{cargarLaberinto, resolverObstaculo, pausar, reanudar, configurar}
 *   Godot -> React: window.codequestHost.recibirEvento(nombre, json)
 * El volumen elegido en la página se envía con configurar() (Godot reproduce los sonidos del juego).
 * Mismo origen (iframe servido por nuestra app): no hay postMessage abierto a cualquier origen.
 */
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react'

import { type PreferenciaSonido, useSonido } from '../../estado/sonido'
import estilos from './EscenaGodot.module.css'

export const RUTA_JUEGO = '/juego/index.html'

interface ApiGodot {
  cargarLaberinto: (json: string) => void
  resolverObstaculo: (simbolo: string) => void
  pausar: () => void
  reanudar: () => void
  configurar: (json: string) => void
}

export interface ControlEscena {
  cargarLaberinto: (datos: { mapa: string[]; resueltos: string[]; tema: number; avatar: string }) => void
  resolverObstaculo: (simbolo: string) => void
  pausar: () => void
  reanudar: () => void
  enfocar: () => void
}

interface Props {
  titulo: string
  alEvento: (nombre: string, datos: Record<string, unknown>) => void
  /** React 19: ref como prop (sin forwardRef). */
  ref?: Ref<ControlEscena>
}

type VentanaJuego = Window & { codequestGodot?: ApiGodot; codequestHost?: { recibirEvento: (n: string, j: string) => void } }

export function EscenaGodot({ titulo, alEvento, ref }: Props) {
  const marco = useRef<HTMLIFrameElement>(null)
  const alEventoRef = useRef(alEvento)
  useEffect(() => {
    alEventoRef.current = alEvento
  })

  const ventana = () => marco.current?.contentWindow as VentanaJuego | null | undefined
  const godot = () => ventana()?.codequestGodot

  // El host se registra en cuanto el iframe existe: Godot lo busca al terminar de cargar.
  useEffect(() => {
    const registrar = () => {
      const v = ventana()
      if (!v) return
      v.codequestHost = {
        recibirEvento: (nombre, json) => {
          let datos: Record<string, unknown> = {}
          try {
            datos = JSON.parse(json) as Record<string, unknown>
          } catch {
            // Un evento mal formado se ignora (la entrada desde el juego también se valida).
          }
          alEventoRef.current(nombre, datos)
        },
      }
    }
    registrar()
    const elemento = marco.current
    elemento?.addEventListener('load', registrar)
    return () => elemento?.removeEventListener('load', registrar)
  }, [])

  // Cada cambio de volumen o silencio llega al juego al momento.
  useEffect(() => useSonido.subscribe((sonido) => enviarSonido(sonido)), [])

  function enviarSonido({ volumen, silencio }: PreferenciaSonido) {
    godot()?.configurar(JSON.stringify({ volumen, silencio }))
  }

  useImperativeHandle(ref, () => ({
    cargarLaberinto: (datos) => {
      const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      godot()?.configurar(JSON.stringify({ movimiento_reducido: reducir }))
      enviarSonido(useSonido.getState())
      godot()?.cargarLaberinto(JSON.stringify(datos))
    },
    resolverObstaculo: (simbolo) => godot()?.resolverObstaculo(simbolo),
    pausar: () => godot()?.pausar(),
    reanudar: () => godot()?.reanudar(),
    // Godot solo recibe el teclado si su <canvas> tiene el foco (no basta con enfocar el iframe).
    enfocar: () => {
      marco.current?.focus()
      marco.current?.contentDocument?.querySelector('canvas')?.focus()
    },
  }))

  return <iframe ref={marco} src={RUTA_JUEGO} title={titulo} className={estilos.escena} data-prueba="escena" />
}
