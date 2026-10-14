import type { HTMLAttributes, ReactNode } from 'react'

import estilos from './Tarjeta.module.css'

interface Props extends HTMLAttributes<HTMLElement> {
  titulo?: string
  children: ReactNode
}

export function Tarjeta({ titulo, children, className, ...resto }: Props) {
  return (
    <section className={[estilos.tarjeta, className].filter(Boolean).join(' ')} {...resto}>
      {titulo && <h2 className={estilos.titulo}>{titulo}</h2>}
      {children}
    </section>
  )
}
