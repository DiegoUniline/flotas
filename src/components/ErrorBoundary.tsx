import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/** Sin esto, cualquier excepción de render no capturada tumba TODO el árbol
 * de React y deja la pantalla en blanco sin ningún mensaje — no había
 * ningún error boundary en la app hasta esta fase. Muestra el error real
 * (útil para diagnosticar) en vez de una pantalla en blanco silenciosa. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no capturado:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
          <p className="text-base font-semibold text-ink">Algo salió mal.</p>
          <p className="max-w-md text-sm text-gray-500">
            Ocurrió un error inesperado. Intenta recargar la página; si el problema sigue, avísale al equipo con el
            siguiente detalle.
          </p>
          <pre className="max-w-lg overflow-x-auto rounded-md bg-gray-50 p-3 text-left text-xs text-red-600">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
          >
            Recargar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
