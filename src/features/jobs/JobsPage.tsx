import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { Can } from '@/components/Can'
import { JobsTable } from './components/JobsTable'
import { JobForm, toJobInsert, type JobFormValues } from './components/JobForm'
import { useCreateJob, useDeleteJob, useJobsQuery, useUpdateJob, PAGE_SIZE } from './hooks/useJobs'
import { JOB_STATUSES, type JobFilters, type JobSort, type JobWithRelations } from './api/jobsApi'

type DrawerState = { mode: 'create' } | { mode: 'edit'; job: JobWithRelations } | null

const SELECT_CLASSNAME =
  'rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

export function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({ search: '', status: null, scheduledDate: null })
  const [sort, setSort] = useState<JobSort>({ column: 'scheduled_date', direction: 'desc' })
  const [page, setPage] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobWithRelations | null>(null)

  const jobsQuery = useJobsQuery(filters, sort, page)
  const createMutation = useCreateJob()
  const updateMutation = useUpdateJob()
  const deleteMutation = useDeleteJob()

  const hasFilters = filters.search.trim() !== '' || filters.status !== null || filters.scheduledDate !== null

  function updateFilters(patch: Partial<JobFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(0)
  }

  function handleFormSubmit(values: JobFormValues) {
    const input = toJobInsert(values)
    if (drawer?.mode === 'edit') {
      updateMutation.mutate({ id: drawer.job.id, input }, { onSuccess: () => setDrawer(null) })
    } else {
      createMutation.mutate(input, { onSuccess: () => setDrawer(null) })
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Pedidos</h1>
          <p className="text-sm text-gray-500">Entregas y servicios programados.</p>
        </div>
        <Can permission="jobs.manage">
          <Button onClick={() => setDrawer({ mode: 'create' })}>Nuevo pedido</Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por número de pedido"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="max-w-xs"
        />
        <Input
          type="date"
          value={filters.scheduledDate ?? ''}
          onChange={(e) => updateFilters({ scheduledDate: e.target.value || null })}
          className="w-auto"
        />
        <select value={filters.status ?? ''} onChange={(e) => updateFilters({ status: e.target.value || null })} className={SELECT_CLASSNAME}>
          <option value="">Todos los estados</option>
          {JOB_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <JobsTable
          rows={jobsQuery.data?.rows ?? []}
          loading={jobsQuery.isLoading}
          error={jobsQuery.isError}
          hasFilters={hasFilters}
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          onRetry={() => void jobsQuery.refetch()}
          onCreate={() => setDrawer({ mode: 'create' })}
          onEdit={(job) => setDrawer({ mode: 'edit', job })}
          onDelete={(job) => setDeleteTarget(job)}
        />
        {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.rows.length ?? 0) > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={jobsQuery.data?.count ?? 0} onPageChange={setPage} />
        )}
      </div>

      <Drawer open={drawer !== null} title={drawer?.mode === 'edit' ? 'Editar pedido' : 'Nuevo pedido'} onClose={() => setDrawer(null)}>
        <JobForm
          job={drawer?.mode === 'edit' ? drawer.job : undefined}
          submitLabel={drawer?.mode === 'edit' ? 'Guardar cambios' : 'Crear pedido'}
          loading={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar pedido"
        description={`¿Seguro que quieres eliminar el pedido "${deleteTarget?.job_number ?? deleteTarget?.id.slice(0, 8)}"?`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
