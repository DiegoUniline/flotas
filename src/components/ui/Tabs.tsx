export interface TabItem {
  key: string
  label: string
  count?: number
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
}

export function Tabs({ items, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            active === item.key ? 'border-accent-500 text-accent-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {item.label}
          {item.count != null && <span className="ml-1.5 text-xs text-gray-400">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}
