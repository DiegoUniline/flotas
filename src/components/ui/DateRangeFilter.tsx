import { useRef, useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { DATE_RANGE_PRESETS, computeDateRange, formatDateRangeLabel, type DateRangeValue } from '@/lib/dateRanges'

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Calendar size={14} strokeWidth={2} className="text-gray-400" />
        {formatDateRangeLabel(value)}
        <ChevronDown size={14} strokeWidth={2} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-gray-200 bg-white p-1.5 shadow-lg">
          {DATE_RANGE_PRESETS.filter((p) => p.value !== 'custom').map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange(computeDateRange(preset.value))
                setOpen(false)
              }}
              className={`block w-full rounded px-2.5 py-1.5 text-left text-sm hover:bg-gray-50 ${
                value.preset === preset.value ? 'bg-accent-50 text-accent-600' : 'text-gray-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <div className="my-1 border-t border-gray-100" />
          <div className="px-2.5 py-1.5">
            <p className={`mb-1.5 text-sm ${value.preset === 'custom' ? 'text-accent-600' : 'text-gray-700'}`}>Rango personalizado</p>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={value.preset === 'custom' ? (value.from ?? '') : ''}
                onChange={(e) => onChange({ preset: 'custom', from: e.target.value || null, to: value.preset === 'custom' ? value.to : null })}
                className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={value.preset === 'custom' ? (value.to ?? '') : ''}
                onChange={(e) => onChange({ preset: 'custom', from: value.preset === 'custom' ? value.from : null, to: e.target.value || null })}
                className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
