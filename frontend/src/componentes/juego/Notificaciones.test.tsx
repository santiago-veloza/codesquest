import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NOTIFICACIONES } from '../../config/juego'
import { useNotificaciones } from '../../estado/notificaciones'
import { textos } from '../../textos/es'
import { Notificaciones } from './Notificaciones'

const agregar = (...textosAviso: string[]) =>
  act(() => useNotificaciones.getState().agregar(textosAviso.map((texto) => ({ tipo: 'xp' as const, texto }))))

afterEach(() => vi.useRealTimers())

describe('Notificaciones', () => {
  it('muestra los avisos y se cierran solos', () => {
    vi.useFakeTimers()
    render(<Notificaciones />)

    agregar('+15 XP')
    expect(screen.getByText('+15 XP')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(NOTIFICACIONES.duracionMs))
    expect(screen.queryByText('+15 XP')).not.toBeInTheDocument()
  })

  it('se pueden cerrar con el botón', async () => {
    render(<Notificaciones />)
    agregar('+15 XP')

    await userEvent.click(screen.getByRole('button', { name: textos.recompensa.cerrar }))

    expect(screen.queryByText('+15 XP')).not.toBeInTheDocument()
  })

  it('no acumula más avisos de los visibles', () => {
    render(<Notificaciones />)

    agregar(...Array.from({ length: NOTIFICACIONES.maximoVisibles + 2 }, (_, i) => `aviso ${i}`))

    expect(screen.getAllByRole('listitem')).toHaveLength(NOTIFICACIONES.maximoVisibles)
    expect(screen.queryByText('aviso 0')).not.toBeInTheDocument()
  })
})
