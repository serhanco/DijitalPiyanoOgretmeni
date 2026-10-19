import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Back to the map. */
  onHome: () => void
  /**
   * Clears the card when the screen changes. The boundary itself stays mounted (not a `key`),
   * so an error thrown while the old screen unmounts still lands here instead of blanking the page.
   */
  resetKey: string
}

interface State {
  error: Error | null
  resetKey: string
}

const RELOADED = 'dpo-chunk-reload'

/**
 * A screen's part of the app could not be loaded or crashed. After a new
 * version is published, a page opened earlier asks for files that are gone:
 * reload once to get the new ones. Anything else shows what went wrong
 * instead of a blank page, so it can be reported.
 */
function isChunkError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Loading chunk/i.test(
    `${error.name} ${error.message}`,
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey }
  }

  componentDidCatch(error: Error) {
    console.error('Screen crashed', error)
    try {
      // At most one reload a minute, so a file that is really missing cannot loop.
      const last = Number(sessionStorage.getItem(RELOADED) ?? 0)
      if (isChunkError(error) && Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOADED, String(Date.now()))
        window.location.reload()
      }
    } catch {
      // Storage blocked: show the card instead.
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <section className="card crash-card" role="alert" data-crash>
        <h2>Bir şeyler ters gitti 😕</h2>
        <p>
          {isChunkError(error)
            ? 'Uygulamanın yeni sürümü yüklenemedi. Sayfayı yenilemek genelde düzeltir.'
            : 'Bu ekran açılırken bir hata oldu. Aşağıdaki yazıyı bize iletirsen hemen düzeltiriz.'}
        </p>
        <pre className="crash-detail">{`${error.name}: ${error.message}`}</pre>
        <div className="crash-actions">
          <button className="btn" onClick={() => window.location.reload()}>
            Sayfayı yenile
          </button>
          <button className="btn btn-secondary" onClick={this.props.onHome}>
            Haritaya dön
          </button>
        </div>
      </section>
    )
  }
}
