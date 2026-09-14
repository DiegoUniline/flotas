export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'
  | 'all'

export interface DateRangeValue {
  preset: DateRangePreset
  from: string | null
  to: string | null
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana pasada' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: 'this_year', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
  { value: 'all', label: 'Todas las fechas' },
]

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = (day + 6) % 7 // lunes = inicio
  result.setDate(result.getDate() - diff)
  return result
}

export function computeDateRange(preset: DateRangePreset, custom?: { from: string | null; to: string | null }): DateRangeValue {
  const now = new Date()

  switch (preset) {
    case 'today': {
      const iso = toIso(now)
      return { preset, from: iso, to: iso }
    }
    case 'yesterday': {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      const iso = toIso(d)
      return { preset, from: iso, to: iso }
    }
    case 'this_week': {
      const start = startOfWeek(now)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { preset, from: toIso(start), to: toIso(end) }
    }
    case 'last_week': {
      const start = startOfWeek(now)
      start.setDate(start.getDate() - 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { preset, from: toIso(start), to: toIso(end) }
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { preset, from: toIso(start), to: toIso(end) }
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { preset, from: toIso(start), to: toIso(end) }
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31)
      return { preset, from: toIso(start), to: toIso(end) }
    }
    case 'custom':
      return { preset, from: custom?.from ?? null, to: custom?.to ?? null }
    case 'all':
    default:
      return { preset: 'all', from: null, to: null }
  }
}

export function formatDateRangeLabel(value: DateRangeValue): string {
  if (value.preset !== 'custom') {
    return DATE_RANGE_PRESETS.find((p) => p.value === value.preset)?.label ?? 'Todas las fechas'
  }
  if (!value.from && !value.to) return 'Rango personalizado'
  const formatOne = (iso: string) => {
    const [, month, day] = iso.split('-')
    return `${day}/${month}`
  }
  if (value.from && value.to) return `${formatOne(value.from)} - ${formatOne(value.to)}`
  if (value.from) return `Desde ${formatOne(value.from)}`
  return `Hasta ${formatOne(value.to!)}`
}
