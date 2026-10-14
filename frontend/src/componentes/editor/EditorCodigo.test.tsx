import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EditorCodigo } from './EditorCodigo'

describe('EditorCodigo', () => {
  it('muestra el código con un nombre accesible', () => {
    render(<EditorCodigo valor={'energia = ______'} alCambiar={vi.fn()} etiqueta="Tu código" />)

    const area = screen.getByRole('textbox', { name: 'Tu código' })
    expect(area).toHaveTextContent('energia = ______')
  })

  it('resalta el hueco que hay que completar', () => {
    const { container } = render(<EditorCodigo valor={'x = ______'} alCambiar={vi.fn()} etiqueta="Tu código" />)

    const hueco = container.querySelector('.cq-hueco')
    expect(hueco).toHaveTextContent('______')
  })

  it('se actualiza cuando el valor cambia desde fuera (reiniciar código)', () => {
    const { rerender } = render(<EditorCodigo valor="x = 1" alCambiar={vi.fn()} etiqueta="Tu código" />)

    rerender(<EditorCodigo valor="x = ______" alCambiar={vi.fn()} etiqueta="Tu código" />)

    expect(screen.getByRole('textbox', { name: 'Tu código' })).toHaveTextContent('x = ______')
  })
})
