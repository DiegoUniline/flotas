import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Can } from '@/components/Can'
import { groupRows } from '@/lib/groupRows'
import { RecordList, type RecordListItem } from '@/components/ui/RecordList'
import { formatCurrency } from '@/lib/format'
import type { Part, PartSort, PartSortColumn } from '@/features/parts/api/partsApi'

interface Column {
  key: PartSortColumn
  label: string
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'quantity_on_hand', label: 'Existencia' },
  { key: 'unit_cost', label: 'Costo unitario' },
]

function groupLabel(row: Part, groupBy: string): string {
  switch (groupBy) {
    case 'category':
      return row.category ?? 'Sin categoría'
    case 'active':
      return row.active ? 'Activas' : 'Inactivas'
    case 'low_stock':
      return row.min_stock != null && row.quantity_on_hand <= row.min_stock ? 'Stock bajo' : 'Stock normal'
    default:
      return '—'
  }
}

interface PartsTableProps {
  rows: Part[]
  loading: boolean
  error: boolean
  hasFilters: boolean
  sort: PartSort
  onSortChange: (sort: PartSort) => void
  onRetry: () => void
  onCreate: () => void
  groupBy: string | null
}

export function PartsTable({ rows, loading, error, hasFilters, sort, onSortChange, onRetry, onCreate, groupBy }: PartsTableProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (error) {
    return <ErrorState message="No se pudieron cargar las refacciones." onRetry={onRetry} />
  }

  if (loading) {
    return <TableSkeleton columns={5} />
  }

  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." />
    ) : (
      <EmptyState
        title="Aún no hay refacciones"
        description="Registra el inventario de refacciones para poder usarlas en los servicios."
        action={
          <Can permission="maintenance.manage">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Nueva refacción
            </button>
          </Can>
        }
      />
    )
  }

  function toggleSort(column: PartSortColumn) {
    if (sort.column === column) {
      onSortChange({ column, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ column, direction: 'asc' })
    }
  }

  function toggleGroup(key: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function PartRow({ part }: { part: Part }) {
    const lowStock = part.min_stock != null && part.quantity_on_hand <= part.min_stock
    return (
      <tr onClick={() => navigate(`/refacciones/${part.id}`)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">
          {part.name}
          {part.sku && <span className="ml-1.5 text-xs text-gray-400">({part.sku})</span>}
        </td>
        <td className="px-4 py-2 text-gray-700">
          {Number(part.quantity_on_hand).toLocaleString('es-MX')} {part.unit}
          {lowStock && <span className="ml-1.5 rounded-full bg-status-delayed-bg px-1.5 py-0.5 text-xs text-status-delayed">Stock bajo</span>}
        </td>
        <td className="px-4 py-2 text-gray-700">{formatCurrency(part.unit_cost)}</td>
        <td className="px-4 py-2 text-gray-700">{part.category ?? '—'}</td>
        <td className="px-4 py-2 text-gray-700">{part.supplier ?? '—'}</td>
      </tr>
    )
  }

  function toRecord(part: Part): RecordListItem {
    const lowStock = part.min_stock != null && part.quantity_on_hand <= part.min_stock
    return {
      id: part.id,
      onClick: () => navigate(`/refacciones/${part.id}`),
      title: part.name,
      subtitle: part.sku ?? undefined,
      status: lowStock ? { label: 'Stock bajo', tone: 'bg-status-delayed-bg text-status-delayed' } : undefined,
      fields: [
        { label: 'Existencia', value: `${Number(part.quantity_on_hand).toLocaleString('es-MX')} ${part.unit}` },
        { label: 'Costo', value: formatCurrency(part.unit_cost) },
        { label: 'Categoría', value: part.category ?? '—' },
      ],
    }
  }

  const headerRow = (
    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {COLUMNS.map((column) => (
        <th key={column.key} className="px-4 py-2">
          <button type="button" onClick={() => toggleSort(column.key)} className="flex items-center gap-1 hover:text-gray-900">
            {column.label}
            {sort.column === column.key && (sort.direction === 'asc' ? '↑' : '↓')}
          </button>
        </th>
      ))}
      <th className="px-4 py-2">Categoría</th>
      <th className="px-4 py-2">Proveedor</th>
    </tr>
  )

  if (groupBy) {
    const groups = groupRows(
      rows,
      (r) => groupLabel(r, groupBy),
      (r) => groupLabel(r, groupBy),
    )
    return (
      <>
        <div className="hidden sm:block">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">{headerRow}</thead>
            <tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <td colSpan={5} className="px-4 py-1.5">
                  <button type="button" onClick={() => toggleGroup(group.key)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    {collapsed.has(group.key) ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                    {group.label}
                    <span className="font-normal text-gray-400">({group.rows.length})</span>
                  </button>
                </td>
              </tr>
              {!collapsed.has(group.key) && group.rows.map((part) => <PartRow key={part.id} part={part} />)}
            </Fragment>
          ))}
            </tbody>
          </table>
        </div>
        <RecordList
          groups={groups.map((g) => ({ key: g.key, label: g.label, items: g.rows.map(toRecord) }))}
          className="sm:hidden"
        />
      </>
    )
  }

  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">{headerRow}</thead>
          <tbody>
        {rows.map((part) => (
          <PartRow key={part.id} part={part} />
        ))}
          </tbody>
        </table>
      </div>
      <RecordList items={rows.map(toRecord)} className="sm:hidden" />
    </>
  )
}
