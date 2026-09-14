import { Button } from './Button'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5 text-sm text-gray-600">
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 0}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= totalPages}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
