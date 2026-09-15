import { useEffect, useState } from 'react'

/**
 * Reemplazo directo de `useState` para un slice de estado de una pantalla de
 * lista (búsqueda, filtros, orden, página, rango de fecha, agrupar por...)
 * que además se persiste en `sessionStorage`. Se hidrata una sola vez al
 * montar (lazy initializer) y se reescribe en cada cambio.
 *
 * Por qué hace falta: antes cada lista (`VehiclesPage`, `JobsPage`, etc.)
 * guardaba este estado en `useState` local puro — al navegar a la ficha de
 * detalle (`/modulo/:id`) el componente de lista se desmonta, y al volver
 * ("Atrás") se remonta desde cero con los filtros/búsqueda/página en blanco.
 * El punto 2 de la pasada de UX móvil pide explícitamente conservar ese
 * estado al volver de un detalle.
 *
 * `sessionStorage`, nunca `localStorage` — mismo criterio ya documentado en
 * CLAUDE.md para el borrador del wizard de Pedidos y la intención de
 * compartir ubicación: es estado de una sesión de trabajo (se pierde al
 * cerrar la pestaña, que es lo esperado), no una preferencia de usuario ni
 * config de organización.
 *
 * `key` debe ser único por campo dentro de un módulo, p. ej.
 * `'vehicles.search'`, `'vehicles.sort'` — así cada slice se guarda aparte y
 * un módulo nuevo no choca con otro.
 */
export function useListState<T>(key: string, initialValue: T | (() => T)) {
  const storageKey = `flotaa:list-state:${key}`

  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw != null) return JSON.parse(raw) as T
    } catch {
      // sessionStorage no disponible (ventana privada) o valor corrupto —
      // caer al valor inicial en vez de tronar.
    }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // no-op — no es crítico si no se pudo persistir
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, state])

  return [state, setState] as const
}
