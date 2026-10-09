import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StateMessageProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Buttons that resolve the state. */
  children?: ReactNode
  /** Technical detail for debugging, hidden behind a disclosure. */
  detail?: string | null
  tone?: 'neutral' | 'error'
}

/** Empty and error states: what happened, what the user can do, and the action to do it. */
export function StateMessage({ icon: Icon, title, description, children, detail, tone = 'neutral' }: StateMessageProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="animate-fade-up flex flex-col items-center px-4 py-8 text-center"
    >
      <span
        className={`grid size-12 place-items-center rounded-full ${tone === 'error' ? 'bg-high-soft text-high' : 'bg-raised text-muted'}`}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="mt-3 text-title font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-72 text-body-sm text-muted">{description}</p> : null}
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div> : null}
      {detail ? (
        <details className="mt-4 text-caption text-subtle">
          <summary className="cursor-pointer select-none">Detalles técnicos</summary>
          <code className="mt-1 block font-mono break-all">{detail}</code>
        </details>
      ) : null}
    </div>
  )
}
