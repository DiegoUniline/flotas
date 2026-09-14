const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// TODO: leer organizations.currency cuando el producto soporte multi-moneda real.
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return currencyFormatter.format(value)
}

/** Formato dd/mm/yyyy para columnas `date` (sin hora). Estándar en toda la
 * UI — parsea el string directamente en vez de pasar por `Date` para no
 * arrastrar corrimientos de zona horaria en fechas sin hora. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** Formato dd/mm/yyyy HH:mm para columnas `timestamptz`, en hora local del navegador. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}
