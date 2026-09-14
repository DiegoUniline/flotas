const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// TODO: leer organizations.currency cuando el producto soporte multi-moneda real.
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return currencyFormatter.format(value)
}
