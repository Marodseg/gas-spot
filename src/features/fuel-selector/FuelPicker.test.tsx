import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FuelPicker } from './FuelPicker'

describe('FuelPicker', () => {
  it('marca el combustible activo y permite cambiarlo', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<FuelPicker selectedId={6} onSelect={onSelect} />)
    const diesel = screen.getByRole('radio', { name: 'Diésel' })
    expect(diesel).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: '95' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 10, label: 'Gasolina 95' }))
  })
})
