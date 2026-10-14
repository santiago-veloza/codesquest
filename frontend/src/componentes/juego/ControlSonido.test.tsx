import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useSonido } from '../../estado/sonido'
import { textos } from '../../textos/es'
import { ControlSonido } from './ControlSonido'

describe('ControlSonido', () => {
  it('el botón alterna el silencio y lo anuncia con aria-pressed', async () => {
    render(<ControlSonido />)
    const boton = screen.getByRole('button', { name: textos.sonido.silenciar })
    expect(boton).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(boton)

    expect(boton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('slider', { name: textos.sonido.volumen })).toHaveValue('0')
  })

  it('el deslizador cambia el volumen', () => {
    render(<ControlSonido />)

    fireEvent.change(screen.getByRole('slider', { name: textos.sonido.volumen }), { target: { value: '30' } })

    expect(useSonido.getState().volumen).toBe(0.3)
  })
})
