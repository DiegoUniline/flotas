import { EmptyState } from '@/components/ui/EmptyState'
import { PageScroll } from '@/components/ui/PageScroll'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <PageScroll>
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white">
        <EmptyState
          title="Próximamente"
          description={`${title} está en el roadmap de FLOTAA y todavía no está disponible.`}
        />
      </div>
    </div>
    </PageScroll>
  )
}
