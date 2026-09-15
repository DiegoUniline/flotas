import type { ButtonHTMLAttributes } from 'react'

type IconButtonVariant = 'ghost' | 'outline'
type IconButtonSize = 'sm' | 'md'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost: 'text-gray-500 hover:bg-gray-100 hover:text-ink',
  outline: 'border border-gray-300 bg-surface text-gray-600 hover:bg-gray-50',
}

/** `md` = 44px real (el mínimo táctil recomendado en iOS/Android) sin
 * engordar el ícono visualmente — el padding invisible es lo que crece,
 * no el ícono. `sm` = 36px para contextos donde varios de estos van
 * pegados uno junto a otro y 44px cada uno se sentiría exagerado (p. ej.
 * el "×" de un toast compacto). Nunca usar `sm` para el control principal
 * de una pantalla (hamburguesa, cerrar un modal). */
const SIZE_CLASSES: Record<IconButtonSize, string> = {
  md: 'h-11 w-11',
  sm: 'h-9 w-9',
}

/** Botón de un solo ícono, sin texto — reemplaza los `<button className="p-2 ...">`
 * sueltos que había en Header/Modal/Drawer/Sidebar/Toast, cada uno con su
 * propio padding improvisado (algunos por debajo del mínimo táctil real).
 * Un solo lugar para el tamaño de tap y el estado de foco visible
 * (`focus-visible:ring`) de cualquier botón de ícono del proyecto. */
export function IconButton({ variant = 'ghost', size = 'md', className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
