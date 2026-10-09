import { ChevronDown } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

const base =
  'relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-body-sm font-semibold whitespace-nowrap transition-colors duration-150 select-none'
const idle = 'border border-line-strong bg-surface text-ink hover:bg-raised'
const active = 'border border-ink bg-ink text-surface'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

/** Toggle chip when `active` is given (exposed as aria-pressed), plain action chip otherwise. */
export function Chip({ active: isActive, className = '', children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={`${base} ${isActive ? active : idle} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

interface ChipSelectProps<T extends string | number> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  /** Highlight when the value differs from the default. */
  highlighted?: boolean
  icon?: ReactNode
}

/**
 * Chip that opens the platform picker. A transparent native <select> covers
 * the chip, so phones get their own wheel/sheet and keyboards work for free.
 */
export function ChipSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  highlighted = false,
  icon,
}: ChipSelectProps<T>) {
  const current = options.find((option) => option.value === value)
  return (
    <span className={`${base} ${highlighted ? active : idle} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent`}>
      {icon}
      {current?.label ?? label}
      <ChevronDown aria-hidden className="-mr-1 size-3.5 opacity-60" />
      <select
        aria-label={label}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
        value={String(value)}
        onChange={(event) => {
          const next = options.find((option) => String(option.value) === event.target.value)
          if (next) onChange(next.value)
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  )
}
