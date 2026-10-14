import { useEffect, useRef } from 'react'

import { NOTIFICACIONES } from '../../config/juego'
import { type Notificacion, useNotificaciones } from '../../estado/notificaciones'
import { textos } from '../../textos/es'
import estilos from './Notificaciones.module.css'

/**
 * Avisos flotantes de recompensa. Usa la API Popover para quedar en la capa superior del navegador,
 * por encima incluso de un <dialog> abierto (el modal del desafío). Si el navegador no la soporta,
 * se muestra como un elemento fijo normal. Lo mismo se anuncia dentro del modal (ResumenRecompensa),
 * así que nadie depende de este aviso para enterarse.
 */
// Sin soporte, el atributo popover podría ocultar la capa sin forma de mostrarla: solo se pone si existe.
const SOPORTA_POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype

export function Notificaciones() {
  const avisos = useNotificaciones((s) => s.avisos)
  const capa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = capa.current
    if (!elemento || !SOPORTA_POPOVER) return
    // Volver a abrirla la pone encima de lo que se haya abierto después (p. ej. un diálogo).
    if (elemento.matches(':popover-open')) elemento.hidePopover()
    if (avisos.length > 0) elemento.showPopover()
  }, [avisos])

  return (
    <div ref={capa} popover={SOPORTA_POPOVER ? 'manual' : undefined} className={estilos.capa} aria-label={textos.recompensa.region} role="region">
      <ul className={estilos.lista}>
        {avisos.map((aviso) => (
          <Aviso key={aviso.id} aviso={aviso} />
        ))}
      </ul>
    </div>
  )
}

function Aviso({ aviso }: { aviso: Notificacion }) {
  const quitar = useNotificaciones((s) => s.quitar)

  useEffect(() => {
    const temporizador = window.setTimeout(() => quitar(aviso.id), NOTIFICACIONES.duracionMs)
    return () => window.clearTimeout(temporizador)
  }, [aviso.id, quitar])

  return (
    <li className={`${estilos.aviso} ${estilos[aviso.tipo]}`}>
      {aviso.icono && <img src={aviso.icono} alt="" width={28} height={28} className={estilos.icono} />}
      <span>{aviso.texto}</span>
      <button type="button" className={estilos.cerrar} onClick={() => quitar(aviso.id)} aria-label={textos.recompensa.cerrar}>
        ×
      </button>
    </li>
  )
}
