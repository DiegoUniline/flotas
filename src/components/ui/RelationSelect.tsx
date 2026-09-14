import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Drawer } from './Drawer'

export interface RelationOption {
  id: string
  label: string
}

interface RelationSelectProps {
  value: string | null
  displayLabel: string | null
  onSelect: (option: RelationOption | null) => void
  onSearch: (query: string) => Promise<RelationOption[]>
  placeholder?: string
  disabled?: boolean
  createLabel?: string
  renderCreateForm?: (params: { initialName: string; onCreated: (option: RelationOption) => void; onCancel: () => void }) => ReactNode
}

const GHOST_CLASSNAME =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-left text-sm text-gray-900 transition-colors hover:border-gray-200 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-500'

export function RelationSelect({
  value,
  displayLabel,
  onSelect,
  onSearch,
  placeholder = 'Agregar…',
  disabled,
  createLabel = 'Sucursal',
  renderCreateForm,
}: RelationSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<RelationOption[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 250)
  const containerRef = useRef<HTMLDivElement>(null)
  // onSearch suele ser un closure nuevo en cada render del padre (captura
  // activeOrg, etc.); guardarlo en un ref evita relanzar la búsqueda por eso.
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  useClickOutside(containerRef, () => setOpen(false), open)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    onSearchRef
      .current(debouncedQuery)
      .then((result) => {
        if (!cancelled) setOptions(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, debouncedQuery])

  function handleSelect(option: RelationOption) {
    onSelect(option)
    setOpen(false)
    setQuery('')
  }

  const showCreate = renderCreateForm && query.trim().length > 0 && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())

  if (disabled) {
    return <div className="px-1.5 py-1 text-sm text-gray-500">{displayLabel || '—'}</div>
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(true)} className={GHOST_CLASSNAME}>
        {displayLabel || <span className="text-gray-400">{placeholder}</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-md border border-gray-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showCreate) {
                e.preventDefault()
                setCreating(true)
              }
            }}
            placeholder="Buscar..."
            className="w-full border-b border-gray-100 px-3 py-2 text-sm text-gray-900 focus:outline-none"
          />
          <div className="max-h-56 overflow-y-auto p-1">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null)
                  setOpen(false)
                }}
                className="block w-full rounded px-2.5 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-50"
              >
                Quitar selección
              </button>
            )}
            {loading ? (
              <p className="px-2.5 py-1.5 text-sm text-gray-400">Buscando…</p>
            ) : options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="block w-full rounded px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {option.label}
                </button>
              ))
            ) : (
              !showCreate && <p className="px-2.5 py-1.5 text-sm text-gray-400">Sin resultados</p>
            )}
            {showCreate && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-sm font-medium text-accent-600 hover:bg-accent-50"
              >
                <Plus size={13} strokeWidth={2} />
                Crear "{query.trim()}"…
              </button>
            )}
          </div>
        </div>
      )}

      {renderCreateForm && (
        <Drawer open={creating} title={`Nuevo ${createLabel.toLowerCase()}`} onClose={() => setCreating(false)}>
          {renderCreateForm({
            initialName: query.trim(),
            onCreated: (option) => {
              setCreating(false)
              setOpen(false)
              setQuery('')
              onSelect(option)
            },
            onCancel: () => setCreating(false),
          })}
        </Drawer>
      )}
    </div>
  )
}
