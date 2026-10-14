import type { ButtonHTMLAttributes, ReactNode } from 'react'

import estilos from './Boton.module.css'

type Variante = 'primario' | 'secundario' | 'fantasma'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  /** Muestra el texto de carga, deshabilita el botón y lo anuncia a lectores de pantalla. */
  cargando?: boolean
  textoCargando?: string
  anchoCompleto?: boolean
  children: ReactNode
}

export function Boton({
  variante = 'primario',
  cargando = false,
  textoCargando,
  anchoCompleto = false,
  type = 'button',
  disabled,
  className,
  children,
  ...resto
}: Props) {
  const clases = [estilos.boton, estilos[variante], anchoCompleto && estilos.anchoCompleto, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} className={clases} disabled={disabled || cargando} aria-busy={cargando} {...resto}>
      {cargando && <span className={estilos.indicador} aria-hidden="true" />}
      {cargando && textoCargando ? textoCargando : children}
    </button>
  )
}
