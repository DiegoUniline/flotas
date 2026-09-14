import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Can } from '@/components/Can'
import { volumetricWeightKg, type JobPackage, type JobPackageUpdate } from '@/features/jobs/api/jobPackagesApi'
import { useCreateJobPackage, useDeleteJobPackage, useJobPackages, useUpdateJobPackage } from '@/features/jobs/hooks/useJobDetail'

const CELL_INPUT_CLASSNAME =
  'w-full border-0 border-b-2 border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-900 transition-colors hover:border-gray-200 focus:border-accent-500 focus:outline-none'

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

interface PackageRowProps {
  pkg: JobPackage
  onSave: (input: JobPackageUpdate) => void
  onDelete: () => void
  deleting: boolean
}

function PackageRow({ pkg, onSave, onDelete, deleting }: PackageRowProps) {
  const [draft, setDraft] = useState({
    quantity: String(pkg.quantity),
    weight_kg: pkg.weight_kg != null ? String(pkg.weight_kg) : '',
    length_cm: pkg.length_cm != null ? String(pkg.length_cm) : '',
    width_cm: pkg.width_cm != null ? String(pkg.width_cm) : '',
    height_cm: pkg.height_cm != null ? String(pkg.height_cm) : '',
    description: pkg.description ?? '',
    declared_value: pkg.declared_value != null ? String(pkg.declared_value) : '',
  })

  const volumetric = volumetricWeightKg({
    length_cm: toNullableNumber(draft.length_cm),
    width_cm: toNullableNumber(draft.width_cm),
    height_cm: toNullableNumber(draft.height_cm),
  })

  function update<K extends keyof typeof draft>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function commit() {
    onSave({
      quantity: Number(draft.quantity) || 1,
      weight_kg: toNullableNumber(draft.weight_kg),
      length_cm: toNullableNumber(draft.length_cm),
      width_cm: toNullableNumber(draft.width_cm),
      height_cm: toNullableNumber(draft.height_cm),
      description: draft.description || null,
      declared_value: toNullableNumber(draft.declared_value),
    })
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="px-2 py-1">
        <input type="number" min="1" value={draft.quantity} onChange={(e) => update('quantity', e.target.value)} onBlur={commit} className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-2 py-1">
        <input
          value={draft.description}
          onChange={(e) => update('description', e.target.value)}
          onBlur={commit}
          placeholder="Contenido…"
          className={CELL_INPUT_CLASSNAME}
        />
      </td>
      <td className="px-2 py-1">
        <input type="number" step="0.01" min="0" value={draft.weight_kg} onChange={(e) => update('weight_kg', e.target.value)} onBlur={commit} className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-1 py-1">
        <input type="number" step="0.1" min="0" value={draft.length_cm} onChange={(e) => update('length_cm', e.target.value)} onBlur={commit} placeholder="L" className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-1 py-1">
        <input type="number" step="0.1" min="0" value={draft.width_cm} onChange={(e) => update('width_cm', e.target.value)} onBlur={commit} placeholder="A" className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-1 py-1">
        <input type="number" step="0.1" min="0" value={draft.height_cm} onChange={(e) => update('height_cm', e.target.value)} onBlur={commit} placeholder="H" className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-2 py-1 text-xs text-gray-400">{volumetric != null ? `${volumetric.toFixed(2)} kg` : '—'}</td>
      <td className="px-2 py-1">
        <input type="number" step="0.01" min="0" value={draft.declared_value} onChange={(e) => update('declared_value', e.target.value)} onBlur={commit} className={CELL_INPUT_CLASSNAME} />
      </td>
      <td className="px-2 py-1 text-right">
        <Can permission="jobs.manage">
          <button type="button" onClick={onDelete} disabled={deleting} className="text-gray-400 hover:text-red-600 disabled:opacity-40">
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </Can>
      </td>
    </tr>
  )
}

export function JobPackagesTab({ jobId }: { jobId: string }) {
  const packagesQuery = useJobPackages(jobId)
  const createMutation = useCreateJobPackage(jobId)
  const updateMutation = useUpdateJobPackage(jobId)
  const deleteMutation = useDeleteJobPackage(jobId)

  const packages = packagesQuery.data ?? []
  const totalPieces = packages.reduce((sum, p) => sum + p.quantity, 0)
  const totalWeight = packages.reduce((sum, p) => sum + (p.weight_kg ?? 0) * p.quantity, 0)
  const totalVolumetric = packages.reduce((sum, p) => {
    const v = volumetricWeightKg(p)
    return sum + (v ?? 0) * p.quantity
  }, 0)

  if (packagesQuery.isLoading) {
    return (
      <div className="py-4">
        <Skeleton className="h-16" />
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">Bultos del pedido: peso, medidas y valor declarado por paquete.</p>
        <Can permission="jobs.manage">
          <button
            type="button"
            onClick={() => createMutation.mutate({ quantity: 1 })}
            className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <Plus size={15} strokeWidth={2} />
            Agregar paquete
          </button>
        </Can>
      </div>

      {packages.length === 0 ? (
        <EmptyState title="Sin paquetes" description="Agrega al menos un paquete con su peso y medidas." />
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">Cant.</th>
                <th className="px-2 py-2">Contenido</th>
                <th className="px-2 py-2">Peso (kg)</th>
                <th className="px-1 py-2" colSpan={3}>
                  Medidas (cm)
                </th>
                <th className="px-2 py-2">Peso vol.</th>
                <th className="px-2 py-2">Valor declarado</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <PackageRow
                  key={pkg.id}
                  pkg={pkg}
                  onSave={(input) => updateMutation.mutate({ id: pkg.id, input })}
                  onDelete={() => deleteMutation.mutate(pkg.id)}
                  deleting={deleteMutation.isPending && deleteMutation.variables === pkg.id}
                />
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-6 text-xs text-gray-500">
            <span>
              <strong className="text-gray-700">{totalPieces}</strong> piezas
            </span>
            <span>
              <strong className="text-gray-700">{totalWeight.toFixed(2)} kg</strong> peso real
            </span>
            <span>
              <strong className="text-gray-700">{totalVolumetric.toFixed(2)} kg</strong> peso volumétrico (L×A×H/5000)
            </span>
          </div>
        </>
      )}
    </div>
  )
}
