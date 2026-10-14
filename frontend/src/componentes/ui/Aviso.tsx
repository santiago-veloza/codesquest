import type { ReactNode } from 'react'

import estilos from './Aviso.module.css'

type Tipo = 'error' | 'exito' | 'info'

interface Props {
  tipo?: Tipo
  children: ReactNode
}

/** Mensaje destacado. Los errores usan role="alert" para que el lector de pantalla los anuncie. */
export function Aviso({ tipo = 'info', children }: Props) {
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`${estilos.aviso} ${estilos[tipo]}`}>
      {children}
    </div>
  )
}
