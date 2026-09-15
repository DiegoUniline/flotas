import { forwardRef, type ReactNode } from 'react'

/** Contenedor de scroll de toda tabla densa 90/10 del proyecto — el
 * `<thead>` de cada tabla depende de que ESTE div sea su contenedor de
 * scroll (`sticky top-0` solo funciona respecto a él). `overflow-x-auto`
 * es igual de necesario que el vertical: estas tablas tienen columnas de
 * escritorio que no caben en un celular (ninguna se pensó como "colapsa a
 * tarjetas en móvil" — es una app densa tipo Odoo), así que sin scroll
 * horizontal el contenido de más quedaría oculto/cortado en vez de
 * simplemente deslizarse para verlo, que es lo mínimo esperable de una
 * tabla en un teléfono.
 *
 * Desde la pasada de "app móvil real": la tabla en sí ahora se oculta en
 * celular (`hidden sm:block`) a favor de `RecordList` en los módulos de
 * registros repetitivos — este contenedor sigue siendo el mismo para
 * ambos casos (es el que scrollea, y el que `useScrollRestoration` referencía
 * por `ref` para conservar la posición al volver de un detalle). */
export const TableScrollArea = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(
  function TableScrollArea({ children, className = '' }, ref) {
    return (
      <div ref={ref} className={`min-h-0 flex-1 overflow-x-auto overflow-y-auto ${className}`}>
        {children}
      </div>
    )
  },
)
