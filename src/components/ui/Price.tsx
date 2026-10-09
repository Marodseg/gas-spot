import { formatPriceValue } from '../../utils/format'

type Size = 'md' | 'lg' | 'xl'

const sizes: Record<Size, { value: string; unit: string }> = {
  md: { value: 'text-title', unit: 'text-caption' },
  lg: { value: 'text-[1.625rem] leading-8', unit: 'text-body-sm' },
  xl: { value: 'text-display', unit: 'text-body' },
}

/** "1,749 €/L" with the number dominant and the unit quiet, read as one phrase by screen readers. */
export function Price({ value, size = 'lg', className = '' }: { value: number; size?: Size; className?: string }) {
  const style = sizes[size]
  return (
    <span className={`tabular inline-flex items-baseline gap-1 font-semibold tracking-tight ${className}`}>
      <span className={style.value}>{formatPriceValue(value)}</span>
      <span className={`${style.unit} font-medium tracking-normal text-muted`}>€/L</span>
    </span>
  )
}
