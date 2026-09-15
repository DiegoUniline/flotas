import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { ThemePreference } from '@/features/organizations/api/organizationsApi'
import { IconButton } from './IconButton'

const ORDER: ThemePreference[] = ['system', 'light', 'dark']
const ICON: Record<ThemePreference, typeof Sun> = { system: Monitor, light: Sun, dark: Moon }
const LABEL: Record<ThemePreference, string> = { system: 'Tema: automático', light: 'Tema: claro', dark: 'Tema: oscuro' }

/** Botón compacto que rota system → light → dark → system. Un solo
 * control (no un select) porque son 3 opciones y ya es un ícono
 * reconocible — mismo criterio de "≤6 opciones, mínimos clics" usado en
 * `InlineField type="buttons"`. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const Icon = ICON[preference]

  return (
    <IconButton onClick={() => setPreference(ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length])} title={LABEL[preference]} aria-label={LABEL[preference]} className={className}>
      <Icon size={18} strokeWidth={2} />
    </IconButton>
  )
}

/** Variante con etiqueta, para menús desplegables (menú compacto del
 * Header en celular). */
export function ThemeToggleMenuItem() {
  const { preference, setPreference } = useTheme()
  const Icon = ICON[preference]

  return (
    <button
      type="button"
      onClick={() => setPreference(ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length])}
      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
    >
      <Icon size={16} strokeWidth={2} />
      {LABEL[preference]}
    </button>
  )
}
