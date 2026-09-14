const IGNORED_FIELDS = new Set(['id', 'organization_id', 'created_at', 'updated_at', 'created_by'])

export interface FieldChange {
  field: string
  from: unknown
  to: unknown
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(vacío)'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}

export function diffAuditValues(oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null): FieldChange[] {
  if (!oldValues || !newValues) return []
  const fields = new Set([...Object.keys(oldValues), ...Object.keys(newValues)])
  const changes: FieldChange[] = []
  for (const field of fields) {
    if (IGNORED_FIELDS.has(field)) continue
    const from = oldValues[field]
    const to = newValues[field]
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field, from, to })
    }
  }
  return changes
}

export { formatValue }
