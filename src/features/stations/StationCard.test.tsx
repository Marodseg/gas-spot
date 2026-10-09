import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RankedStation } from '../../utils/ranking'
import { StationCard } from './StationCard'

const now = new Date('2026-10-08T12:00:00Z')

const item: RankedStation = {
  station: {
    id: 7,
    name: 'Repsol',
    brand: 'Repsol',
    address: 'Avenida de Andalucía, 23',
    locality: 'Granada',
    municipality: 'Granada',
    province: 'Granada',
    postalCode: '18006',
    latitude: 37.17,
    longitude: -3.6,
    distanceKm: 1.2,
    schedule: 'L-D: 24H',
    saleType: 'public',
    margin: 'none',
    municipalityId: 1,
    updatedAt: '2026-10-08T11:46:00Z',
    prices: { Diesel: 1.469 },
    services: null,
  },
  price: 1.469,
  band: 'cheap',
  bandLabel: 'Barato en la zona',
  cost: null,
  openStatus: 'open',
  isBest: true,
  isCheapest: true,
  isNearest: true,
}

describe('StationCard', () => {
  it('prioriza precio, nombre y distancia y no depende solo del color', () => {
    render(<StationCard item={item} selected={false} bestReason="La más barata y la más cercana" now={now} onSelect={vi.fn()} />)
    expect(screen.getByText('1,469')).toBeInTheDocument()
    expect(screen.getByText('€/L')).toBeInTheDocument()
    expect(screen.getByText('Repsol')).toBeInTheDocument()
    expect(screen.getByText('1,2 km')).toBeInTheDocument()
    expect(screen.getByText('Barato en la zona')).toBeInTheDocument()
    expect(screen.getByText('Recomendada')).toBeInTheDocument()
    expect(screen.getByText('Actualizado hace 14 min')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cómo llegar a Repsol' })).toBeInTheDocument()
  })

  it('selecciona la gasolinera al pulsar la tarjeta', async () => {
    const onSelect = vi.fn()
    render(<StationCard item={item} selected bestReason={null} now={now} onSelect={onSelect} />)
    expect(screen.getByRole('article')).toHaveAttribute('aria-current', 'true')
    await userEvent.setup().click(screen.getByText('Repsol'))
    expect(onSelect).toHaveBeenCalledWith(7)
  })
})
