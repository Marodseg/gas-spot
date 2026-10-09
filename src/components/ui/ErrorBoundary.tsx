import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** Rendered instead of the children after they throw. */
  fallback: ReactNode
  children: ReactNode
}

/**
 * Keeps a failing part (typically a lazily loaded chunk that could not be
 * fetched, e.g. offline or after a new deploy) from taking down the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
