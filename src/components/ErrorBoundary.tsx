import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  info: string | null
}

/**
 * Without this, any render-time throw unmounts the whole tree and leaves a
 * blank page — which is impossible to diagnose on a phone with no console.
 * Showing the message and stack turns that into something readable.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? null })
    console.error('Unhandled error', error, info)
  }

  private reset = () => {
    this.setState({ error: null, info: null })
  }

  private hardReset = async () => {
    // Escape hatch for a bad cached build: drop the service worker and its
    // caches, then reload from the network.
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations()
      await Promise.all((registrations ?? []).map((registration) => registration.unregister()))
      const keys = await caches?.keys()
      await Promise.all((keys ?? []).map((key) => caches.delete(key)))
    } catch {
      // Best effort; reload regardless.
    }
    window.location.reload()
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="text-sm text-muted-foreground">
          The page failed to render. The details below are what went wrong.
        </p>

        <pre className="overflow-x-auto rounded-md border border-border bg-card p-4 text-xs">
          {error.name}: {error.message}
          {error.stack ? `\n\n${error.stack}` : ''}
          {info ? `\n\nComponent stack:${info}` : ''}
        </pre>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => void this.hardReset()}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Clear cached app and reload
          </button>
        </div>
      </div>
    )
  }
}
