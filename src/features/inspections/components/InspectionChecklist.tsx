export interface ChecklistItemDraft {
  templateItemId: string
  label: string
  result: string
  notes: string
}

const RESULT_OPTIONS = [
  { value: 'ok', label: 'Bien' },
  { value: 'issue', label: 'Problema' },
  { value: 'na', label: 'N/A' },
]

const RESULT_TONE: Record<string, string> = {
  ok: 'border-status-active bg-status-active text-white',
  issue: 'border-status-delayed bg-status-delayed text-white',
  na: 'border-gray-300 bg-gray-100 text-gray-600',
}

interface InspectionChecklistProps {
  items: ChecklistItemDraft[]
  readOnly?: boolean
  onChange: (templateItemId: string, patch: Partial<Pick<ChecklistItemDraft, 'result' | 'notes'>>) => void
}

export function InspectionChecklist({ items, readOnly, onChange }: InspectionChecklistProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">Esta plantilla no tiene puntos a revisar todavía.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.templateItemId} className="flex flex-col gap-1.5 rounded-md border border-gray-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-900">{item.label}</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {RESULT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange(item.templateItemId, { result: option.value })}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                    item.result === option.value ? RESULT_TONE[option.value] : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {item.result === 'issue' && (
              <input
                value={item.notes}
                onChange={(e) => onChange(item.templateItemId, { notes: e.target.value })}
                disabled={readOnly}
                placeholder="Describe el problema…"
                className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
