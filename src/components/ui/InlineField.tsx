import type { ChangeEvent } from 'react'

type InlineFieldType = 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'checkbox'

interface InlineFieldOption {
  value: string
  label: string
}

interface InlineFieldProps {
  value: string
  onChange: (value: string) => void
  type?: InlineFieldType
  options?: InlineFieldOption[]
  placeholder?: string
  /** true = campo calculado o sin permiso: se muestra solo lectura. */
  readOnly?: boolean
  error?: string
  id?: string
}

const GHOST_CLASSNAME =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-200 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-500'

export function InlineField({ value, onChange, type = 'text', options, placeholder = 'Agregar…', readOnly, error, id }: InlineFieldProps) {
  if (readOnly) {
    return <div className="px-1.5 py-1 text-sm text-gray-500">{value || '—'}</div>
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    onChange(event.target.value)
  }

  return (
    <div>
      {type === 'select' ? (
        <select id={id} value={value} onChange={handleChange} className={GHOST_CLASSNAME}>
          <option value="">{placeholder}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={id} value={value} onChange={handleChange} placeholder={placeholder} rows={2} className={GHOST_CLASSNAME} />
      ) : type === 'checkbox' ? (
        <input
          id={id}
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="h-4 w-4 rounded border-gray-300"
        />
      ) : (
        <input id={id} type={type} value={value} onChange={handleChange} placeholder={placeholder} className={GHOST_CLASSNAME} />
      )}
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
