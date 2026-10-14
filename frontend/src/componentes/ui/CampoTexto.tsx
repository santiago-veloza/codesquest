import { type InputHTMLAttributes, useId } from 'react'

import estilos from './Formulario.module.css'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  etiqueta: string
  /** Mensajes de error del campo (por ejemplo, los "detalles" del backend). */
  errores?: readonly string[] | undefined
  ayuda?: string
}

/** Campo con etiqueta visible, ayuda y errores enlazados por aria-describedby. */
export function CampoTexto({ etiqueta, errores = [], ayuda, className, ...resto }: Props) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const tieneError = errores.length > 0
  // Si hay error, reemplaza a la ayuda (evita dos mensajes casi iguales uno debajo del otro).
  const mostrarAyuda = Boolean(ayuda) && !tieneError
  const descritoPor = [mostrarAyuda && idAyuda, tieneError && idError].filter(Boolean).join(' ') || undefined

  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={estilos.entrada}
        aria-invalid={tieneError}
        aria-describedby={descritoPor}
        {...resto}
      />
      {mostrarAyuda && (
        <p id={idAyuda} className={estilos.ayuda}>
          {ayuda}
        </p>
      )}
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
