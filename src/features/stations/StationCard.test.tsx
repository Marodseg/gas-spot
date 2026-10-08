import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RankedStation } from '../../utils/ranking'
import { StationCard } from './StationCard'

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
    updatedAt: null,
    prices: { Diesel: 1.469 },
    services: null,
  },
  price: 1.469,
  band: 'cheap',
  bandLabel: 'De los más baratos',
  cost: null,
  openStatus: 'open',
  isBest: true,
  isCheapest: true,
  isNearest: true,
}

describe('StationCard', () => {
  it('hace visible el precio, la distancia y el estado sin depender solo del color', () => {
    render(
      <StationCard
        item={item}
        selected={false}
        compared={false}
        average={{ provinceId: 18, fuelName: 'Gasoleo A', price: 1.509, calculatedAt: null }}
        provinceName="Granada"
        onSelect={vi.fn()}
        onCompare={vi.fn()}
      />,
    )
    expect(screen.getByText('1,469 €')).toBeInTheDocument()
    expect(screen.getByText(/De los más baratos/)).toBeInTheDocument()
    expect(screen.getByText('1,2 km')).toBeInTheDocument()
    expect(screen.getByText(/por debajo de la media de Granada/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cómo llegar' })).toBeInTheDocument()
  })
})
