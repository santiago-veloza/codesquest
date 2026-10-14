import estilos from './BarraProgreso.module.css'

interface Props {
  etiqueta: string
  valor: number
  maximo: number
  /** Texto que leen los lectores de pantalla en lugar del número (p. ej. "40 de 100 XP"). */
  textoValor?: string
  variante?: 'primario' | 'xp' | 'energia'
}

/** Barra de progreso accesible (role="progressbar"). Se usa para XP, energía y avance por mundo. */
export function BarraProgreso({ etiqueta, valor, maximo, textoValor, variante = 'primario' }: Props) {
  const acotado = Math.min(Math.max(valor, 0), maximo)
  const porcentaje = maximo > 0 ? (acotado / maximo) * 100 : 0

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.encabezado}>
        <span>{etiqueta}</span>
        <span className={estilos.valor}>{textoValor ?? `${acotado}/${maximo}`}</span>
      </div>
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-valuenow={acotado}
        aria-valuetext={textoValor}
        className={estilos.pista}
      >
        <div className={`${estilos.relleno} ${estilos[variante]}`} style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  )
}
