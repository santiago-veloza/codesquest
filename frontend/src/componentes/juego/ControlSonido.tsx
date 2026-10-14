import { SONIDO } from '../../config/juego'
import { useSonido } from '../../estado/sonido'
import { textos } from '../../textos/es'
import estilos from './ControlSonido.module.css'

const PORCENTAJE = 100

/** Silencio y volumen de todos los sonidos (interfaz y laberinto). */
export function ControlSonido() {
  const { volumen, silencio, ponerVolumen, alternarSilencio } = useSonido()
  const porcentaje = Math.round(volumen * PORCENTAJE)

  return (
    <div role="group" aria-label={textos.sonido.grupo} className={estilos.control}>
      <button
        type="button"
        className={estilos.silencio}
        aria-pressed={silencio}
        aria-label={textos.sonido.silenciar}
        title={textos.sonido.silenciar}
        onClick={alternarSilencio}
      >
        <span aria-hidden="true">{silencio || volumen === 0 ? '🔇' : '🔊'}</span>
      </button>
      <input
        type="range"
        min={0}
        max={PORCENTAJE}
        step={SONIDO.pasoVolumen}
        value={silencio ? 0 : porcentaje}
        aria-label={textos.sonido.volumen}
        aria-valuetext={textos.sonido.porcentaje(silencio ? 0 : porcentaje)}
        onChange={(evento) => ponerVolumen(Number(evento.target.value) / PORCENTAJE)}
        className={estilos.deslizador}
      />
    </div>
  )
}
