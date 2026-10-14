import type { ReactNode } from 'react'

import { textos } from '../../textos/es'
import { Boton } from './Boton'
import estilos from './EstadoVista.module.css'

/** Estados obligatorios de cada pantalla: cargando, vacío y error (con opción de reintentar). */
export function Cargando({ texto = textos.estados.cargando }: { texto?: string }) {
  return (
    <div className={estilos.estado} role="status" aria-live="polite">
      <span className={estilos.indicador} aria-hidden="true" />
      <span>{texto}</span>
    </div>
  )
}

export function Vacio({ children = textos.estados.vacio }: { children?: ReactNode }) {
  return <div className={estilos.estado}>{children}</div>
}

interface PropsError {
  mensaje?: string
  alReintentar?: () => void
}

export function ErrorVista({ mensaje = textos.estados.errorGenerico, alReintentar }: PropsError) {
  return (
    <div className={estilos.estado} role="alert">
      <p className={estilos.mensajeError}>{mensaje}</p>
      {alReintentar && (
        <Boton variante="secundario" onClick={alReintentar}>
          {textos.estados.reintentar}
        </Boton>
      )}
    </div>
  )
}
