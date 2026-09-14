export interface RowGroup<T> {
  key: string
  label: string
  rows: T[]
}

/**
 * Agrupa filas ya cargadas (no re-consulta la base). Cuando hay agrupación
 * activa, el fetch de la lista trae un lote más grande en vez de paginar,
 * para que un grupo no quede cortado entre páginas — ver GROUPED_PAGE_SIZE
 * en cada api de módulo.
 */
export function groupRows<T>(rows: T[], getKey: (row: T) => string, getLabel: (row: T) => string): RowGroup<T>[] {
  const map = new Map<string, RowGroup<T>>()
  for (const row of rows) {
    const key = getKey(row)
    const existing = map.get(key)
    if (existing) {
      existing.rows.push(row)
    } else {
      map.set(key, { key, label: getLabel(row), rows: [row] })
    }
  }
  return Array.from(map.values())
}
