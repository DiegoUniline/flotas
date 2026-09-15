import { Button } from './Button'

interface SaveDiscardBarProps {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
}

export function SaveDiscardBar({ dirty, saving, onSave, onDiscard }: SaveDiscardBarProps) {
  if (!dirty) return null

  return (
    <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-gray-200 bg-surface/95 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur">
      <span className="mr-auto text-xs text-gray-500">Cambios sin guardar</span>
      <Button variant="secondary" onClick={onDiscard} disabled={saving}>
        Descartar
      </Button>
      <Button onClick={onSave} loading={saving}>
        Guardar
      </Button>
    </div>
  )
}
