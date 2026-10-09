import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { PriceBand } from '../../utils/price-scale'

const styles: Record<PriceBand, string> = {
  cheap: 'bg-cheap-soft text-cheap',
  mid: 'bg-mid-soft text-mid',
  high: 'bg-high-soft text-high',
  unknown: 'bg-raised text-muted',
}

/** Price band shown with colour, icon and text, so it never relies on colour alone. */
export function BandBadge({ band, label }: { band: PriceBand; label: string }) {
  const Icon = band === 'cheap' ? TrendingDown : band === 'high' ? TrendingUp : Minus
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-caption font-semibold ${styles[band]}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {label}
    </span>
  )
}
