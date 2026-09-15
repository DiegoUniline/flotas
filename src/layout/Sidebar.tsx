import { NavLink } from 'react-router-dom'
import { useMemo, useRef, useState } from 'react'
import { Truck, Search, X } from 'lucide-react'
import { NAV_SECTIONS, type NavItem, type NavSection } from './navConfig'
import { usePermissions } from '@/context/PermissionsContext'
import { useClickOutside } from '@/hooks/useClickOutside'

interface SidebarProps {
  /** Modo "solo íconos" de escritorio (`lg:` en adelante) — nunca aplica
   * en celular, ahí el sidebar siempre se ve completo porque es un
   * overlay que se abre/cierra entero, no algo que compita por ancho con
   * el contenido. */
  iconOnly: boolean
  /** Controla el overlay en celular (`< lg`) — no tiene efecto en
   * escritorio, donde el sidebar siempre está visible en el flujo normal. */
  mobileOpen: boolean
  onCloseMobile: () => void
  /** Breakpoint real calculado en JS (mismo `useMediaQuery` de `AppShell`).
   * Se usa para no aplicar NINGUNA clase de `translate`/`transition` en
   * escritorio — ver el comentario junto a `<aside>` sobre por qué un
   * `lg:translate-x-0` (para "cancelar" la animación de celular) rompía
   * el z-index del flyout. */
  isDesktop: boolean
}

const DIACRITICS_RANGE = String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f)
const DIACRITICS_REGEX = new RegExp(`[${DIACRITICS_RANGE}]`, 'g')

function normalize(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase()
}

function ItemLabel({ item }: { item: NavItem }) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span className="truncate">{item.label}</span>
      {!item.implemented && (
        <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Próximamente</span>
      )}
    </span>
  )
}

export function Sidebar({ iconOnly, mobileOpen, onCloseMobile, isDesktop }: SidebarProps) {
  const { can } = usePermissions()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  useClickOutside(searchBoxRef, () => setSearchOpen(false), searchOpen)

  const visibleSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.permission || can(item.permission)),
      })).filter((section) => section.items.length > 0),
    [can],
  )

  const normalizedQuery = normalize(query.trim())
  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return visibleSections
    return visibleSections
      .map((section) => ({ ...section, items: section.items.filter((item) => normalize(item.label).includes(normalizedQuery)) }))
      .filter((section) => section.items.length > 0)
  }, [visibleSections, normalizedQuery])

  function closeSearch() {
    setSearchOpen(false)
    setQuery('')
  }

  function renderItem(item: NavItem, compact: boolean) {
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => {
          onCloseMobile()
          closeSearch()
        }}
        title={compact ? item.label : undefined}
        className={({ isActive }) =>
          `group flex items-center gap-2.5 rounded-lg border-l-[3px] px-2.5 py-2.5 text-sm font-medium transition-colors lg:py-2 ${
            isActive ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-ink'
          } ${compact ? 'justify-center' : ''}`
        }
      >
        <item.icon size={18} strokeWidth={2} className="shrink-0" />
        {!compact && <ItemLabel item={item} />}
      </NavLink>
    )
  }

  function renderSection(section: NavSection, compact: boolean) {
    return (
      <div key={section.label} className={compact ? 'group/section relative' : 'mb-5'}>
        {!compact && <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{section.label}</p>}
        <ul className={compact ? 'flex flex-col gap-0.5' : 'mb-5 flex flex-col gap-0.5'}>{section.items.map((item) => renderItem(item, compact))}</ul>

        {/* Flyout al pasar el cursor en modo colapsado — mismo criterio que
            sidebars tipo Notion/Linear: no hace falta expandir todo el
            menú para ver y elegir una vista de esta sección. */}
        {compact && (
          <div className="invisible absolute left-full top-0 z-[1100] ml-1.5 w-56 rounded-lg border border-gray-200 bg-white p-2 opacity-0 shadow-lg transition-opacity duration-100 group-hover/section:visible group-hover/section:opacity-100">
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{section.label}</p>
            <ul className="flex flex-col gap-0.5">{section.items.map((item) => renderItem(item, false))}</ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Fondo del overlay en celular — no existe en `lg:` porque ahí el
          sidebar ya no es un overlay, es parte del layout normal. Igual que
          Modal/Drawer/ConfirmDialog, por encima de 1000: el mapa (Leaflet/
          Google Maps) pinta sus propios controles a `z-[1000]` y, como
          `main` no crea su propio contexto de apilamiento, esos controles
          competían directo contra el `z-50` que tenía antes el sidebar y
          ganaban — bug real reportado por el usuario ("el mapa está
          encimado al menú"). */}
      {mobileOpen && <div className="fixed inset-0 z-[1090] bg-black/30 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}

      {/* La animación de deslizamiento (`translate-x-*`) es solo para
          celular — en escritorio el `<aside>` es `position: static` (el
          `translate` no mueve nada visualmente ahí). Antes se "cancelaba"
          con `lg:translate-x-0`, pero CUALQUIER `translate`/`transform`
          distinto de `none` (incluido `translateX(0)`) crea su propio
          contexto de apilamiento — eso atrapaba el `z-[1100]` del flyout
          DENTRO del `<aside>`, así que como conjunto perdía contra
          `<main>` (que va después en el DOM) sin importar el z-index
          interno: el mapa se seguía pintando encima del flyout aunque los
          números dijeran lo contrario. Bug real, verificado con
          Playwright comparando el DOM real. Por eso ahora la clase de
          `translate`/`transition` ni siquiera se aplica en escritorio —
          se omite en JS (`isDesktop`) en vez de intentar cancelarla con
          `lg:`. */}
      <aside
        className={`fixed inset-y-0 left-0 z-[1100] flex h-full w-72 flex-col border-r border-gray-200 bg-white lg:static lg:z-auto lg:w-auto lg:transition-[width] ${
          isDesktop ? '' : `transition-transform duration-200 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
        } ${iconOnly ? 'lg:w-16' : 'lg:w-60'}`}
      >
        <div className="flex items-center gap-2 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-white">
            <Truck size={18} strokeWidth={2.25} />
          </span>
          {!iconOnly && <span className="text-base font-extrabold tracking-tight text-ink">FLOTAA</span>}
        </div>

        <div className="px-2 pb-2">
          {iconOnly ? (
            <div ref={searchBoxRef} className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen((o) => !o)}
                title="Buscar en el menú"
                className={`flex w-full items-center justify-center rounded-lg border-l-[3px] border-transparent px-2.5 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-ink lg:py-2 ${searchOpen ? 'bg-gray-50 text-ink' : ''}`}
              >
                <Search size={18} strokeWidth={2} />
              </button>
              {searchOpen && (
                <div className="absolute left-full top-0 z-[1100] ml-1.5 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  <div className="relative">
                    <Search size={14} strokeWidth={2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar vista…"
                      className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                  <div className="mt-1.5 max-h-80 overflow-y-auto">
                    {filteredSections.length === 0 ? (
                      <p className="px-2 py-3 text-center text-sm text-gray-400">Sin resultados</p>
                    ) : (
                      filteredSections.map((section) => (
                        <div key={section.label} className="mb-2 last:mb-0">
                          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{section.label}</p>
                          <ul className="flex flex-col gap-0.5">{section.items.map((item) => renderItem(item, false))}</ul>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search size={14} strokeWidth={2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en el menú…"
                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-7 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpiar búsqueda"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </div>

        <nav className={`flex-1 px-2 py-2 ${iconOnly ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {!iconOnly && normalizedQuery && filteredSections.length === 0 && <p className="px-3 py-3 text-center text-sm text-gray-400">Sin resultados</p>}
          {(iconOnly ? visibleSections : filteredSections).map((section) => renderSection(section, iconOnly))}
        </nav>
      </aside>
    </>
  )
}
