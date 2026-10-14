import { type InputHTMLAttributes, type ReactNode, useId } from 'react'

import estilos from './Formulario.module.css'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  children: ReactNode
  errores?: readonly string[] | undefined
}

/** Casilla de verificación con etiqueta (puede contener enlaces) y errores accesibles. */
export function Casilla({ children, errores = [], ...resto }: Props) {
  const id = useId()
  const idError = `${id}-error`
  const tieneError = errores.length > 0

  return (
    <div className={estilos.campo}>
      <div className={estilos.casilla}>
        <input
          id={id}
          type="checkbox"
          aria-invalid={tieneError}
          aria-describedby={tieneError ? idError : undefined}
          {...resto}
        />
        <label htmlFor={id}>{children}</label>
      </div>
      {tieneError && (
        <ul id={idError} className={estilos.errores}>
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
