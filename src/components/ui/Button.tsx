import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

/** `min-h-11` = 44px real, el mínimo táctil recomendado (iOS/Android) —
 * antes era ~36px (`py-2` + `text-sm`), cómodo con mouse pero justo para
 * dedo en celular. `focus-visible:ring` da un anillo de foco real con
 * teclado (antes solo dependía del `outline` del navegador, inconsistente
 * entre navegadores). */
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent-500 text-white hover:bg-accent-600 disabled:bg-gray-300',
  secondary:
    'bg-surface text-gray-800 border border-gray-300 hover:bg-gray-50 disabled:text-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 disabled:text-gray-400',
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
