import { useEffect, useRef } from 'react'

/**
 * Guarda y restaura el `scrollTop` de un contenedor de lista (el div de
 * `TableScrollArea`, o cualquier `RecordList` en celular) en `sessionStorage`,
 * keyed por `key` (usar la ruta del módulo, p. ej. `'vehicles-list'`) — al
 * volver de un detalle, la lista se remonta en la misma posición de scroll en
 * que estaba, no arriba de todo. Mismo criterio de `sessionStorage` que
 * `useListState` (estado de sesión, no preferencia).
 *
 * Uso: `const scrollRef = useScrollRestoration('vehicles-list')` y pasar
 * `scrollRef` como `ref` del contenedor con scroll real (`TableScrollArea`
 * ya lo acepta).
 */
export function useScrollRestoration<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null)
  const storageKey = `flotaa:scroll:${key}`

  useEffect(() => {
    const el = ref.current
    if (!el) return

    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved != null) el.scrollTop = Number(saved)
    } catch {
      // no-op
    }

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(storageKey, String(el.scrollTop))
        } catch {
          // no-op
        }
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [storageKey])

  return ref
}
