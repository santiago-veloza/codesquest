import { type ReactNode, useEffect, useId, useRef } from 'react'

import estilos from './Modal.module.css'

interface Props {
  abierto: boolean
  titulo: string
  /** El usuario pidió cerrar (Escape o botón). */
  alCerrar: () => void
  /** El diálogo terminó de cerrarse y el navegador ya devolvió el foco: momento seguro para moverlo. */
  alCerrado?: () => void
  children: ReactNode
}

/**
 * Ventana modal con <dialog> nativo: el navegador bloquea el fondo, gestiona el foco y cierra con
 * Escape (accesible por teclado y lector de pantalla sin código extra).
 */
export function Modal({ abierto, titulo, alCerrar, alCerrado, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierto && !elemento.open) elemento.showModal()
    if (!abierto && elemento.open) elemento.close()
  }, [abierto])

  return (
    <dialog
      ref={dialogo}
      className={estilos.modal}
      aria-labelledby={idTitulo}
      onClose={() => (abierto ? alCerrar() : alCerrado?.())}
      onCancel={(evento) => {
        evento.preventDefault() // Escape: se cierra desde React para mantener un solo estado.
        alCerrar()
      }}
    >
      <h2 id={idTitulo} className="solo-lector">
        {titulo}
      </h2>
      {abierto && children}
    </dialog>
  )
}
