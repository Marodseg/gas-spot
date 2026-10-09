import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-contrast shadow-sm hover:brightness-[1.08] active:brightness-95',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-raised active:bg-line',
  ghost: 'bg-transparent text-ink hover:bg-ink/6 active:bg-ink/10',
  destructive: 'border border-line-strong bg-surface text-danger hover:bg-high-soft active:brightness-95',
}

// Every size keeps a 44px touch target except `sm` and `icon-sm`, which are
// only used inside larger hit areas or on pointer-precise layouts.
const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-full px-3 text-body-sm',
  md: 'h-11 gap-2 rounded-full px-4 text-body',
  lg: 'h-12 gap-2 rounded-full px-5 text-title',
  icon: 'size-11 rounded-full',
  'icon-sm': 'size-9 rounded-full',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[background-color,filter,transform,color] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}
