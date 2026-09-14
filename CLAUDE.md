# FLOTAA

SaaS multitenant de gestión de flotas para PyME mexicanas. Proyecto comercial:
múltiples empresas pagan mensualidad y comparten la misma instancia de base de
datos, separadas por RLS. Frontend: Vite + React 19 + TypeScript. Backend:
Supabase (Postgres + Auth), proyecto ref `aqjscndhwedlwkpjgwol`.

## Reglas no negociables

- **Multitenant vía RLS, siempre.** Nunca mandes `organization_id` desde el
  frontend como mecanismo de seguridad. RLS ya filtra por membresía real
  (`user_org_ids()`, `has_permission()`). Cuando una query necesita
  `organization_id` (p. ej. para insertar un registro, o para mostrar solo los
  datos de la empresa activa en un usuario multi-org), es un filtro de UX, no
  de seguridad — la seguridad la sigue dando RLS.
- **Cero datos falsos.** Nada de mocks, placeholders, ni secciones de menú que
  apunten a módulos sin implementar. Si no existe, no aparece en la UI.
- **Nada de `localStorage`** para permisos, configuración o preferencias. La
  organización activa del usuario vive en `profiles.active_organization_id`
  (columna agregada en esta fase, ver abajo). Estado de UI efímero (ej.
  sidebar colapsado) puede vivir en memoria de React, pero no persistirse ahí.
- **Dinero:** `numeric`. **Distancias canónicas:** metros. **Timestamps:**
  `timestamptz`.
- **Capas separadas:** UI (componentes) → hooks (`features/*/hooks`, con
  TanStack Query) → servicios de acceso a datos (`features/*/api`, wrappers
  delgados sobre `supabase-js`). Los componentes no llaman a `supabase`
  directamente.
- **Español mexicano** en toda la UI, textos concretos en toasts (p. ej.
  "Sucursal actualizada", nunca "Success"). Preparado para i18n futuro pero
  sin implementarlo aún (no hay librería de i18n instalada).
- **Diseño empresarial denso:** tablas con paginado/orden/filtros ejecutados
  en el backend (nunca traer todo y paginar en cliente), sidebar + drawers
  para alta/edición, nunca modales para formularios largos, nunca `window.confirm`.
- **No inventar tablas ni columnas** que no existan en Supabase. Si hace falta
  una columna nueva (como pasó con `active_organization_id`), se agrega con
  una migración explícita y se documenta aquí.

## Backend (Supabase, ref `aqjscndhwedlwkpjgwol`)

Tablas en `public`, todas con RLS activo: `organizations`,
`organization_settings`, `locations`, `profiles`, `organization_members`,
`roles`, `permissions`, `role_permissions`, `audit_logs`.

Enums: `org_status` (trial|active|suspended|cancelled), `member_status`
(invited|active|suspended|removed).

RPCs: `user_org_ids()`, `is_org_member(uuid)`, `has_permission(uuid, text)`,
`create_organization(p_name, p_slug, p_timezone, p_currency, p_country)`.

### Cambio de esquema hecho en esta fase

`profiles.active_organization_id uuid null references organizations(id) on
delete set null` — no existía ninguna columna para persistir la organización
activa del usuario (requisito: nunca en localStorage). Se agregó vía
`apply_migration` (migración `add_active_organization_to_profiles`). Está
cubierta por la policy existente `profiles_update_self` (`id = auth.uid()`),
no requirió policy nueva. Si se detecta la necesidad de guardar más
preferencias de usuario a futuro, evaluar si conviene mover esto a una tabla
`user_preferences` dedicada en vez de seguir agregando columnas a `profiles`.

### Regenerar tipos

```
mcp__Supabase__generate_typescript_types (project_id: aqjscndhwedlwkpjgwol)
```

Pegar el resultado en `src/types/database.ts`. No editar ese archivo a mano.

### `vehicles` (agregada en esta fase)

Registro de flota, mismo patrón que `locations` (soft delete vía
`deleted_at`, triggers `set_updated_at` y `audit_trigger` reutilizados,
RLS: `vehicles_select` por membresía de org, `vehicles_insert/update/delete`
gateados por `has_permission(org, 'vehicles.create'|'vehicles.edit'|'vehicles.delete')`
— más finos que `locations.manage` porque esos permisos ya existían separados).

Incluye `last_latitude`, `last_longitude`, `last_position_at` (nullable) —
columnas listas para una futura integración de GPS, pero **sin UI que las
edite todavía**: el usuario aún no eligió proveedor/protocolo, así que no hay
forma real de poblarlas y no se debe simular. Cuando se conecte un proveedor
(webhook, Traccar, Wialon, etc.), esas tres columnas son el contrato mínimo
para que el Centro de control empiece a graficar vehículos con posición real
(ver `src/components/map/Map.tsx`, ya genérico). Decisiones pendientes antes
de construir esa integración: protocolo/proveedor de los GPS, si conviene
además una tabla de histórico de posiciones (serie de tiempo) y el mecanismo
de actualización en vivo del mapa (Supabase Realtime vs. polling). No
inventar esa parte sin confirmar con el usuario.

Los permisos `tracking.live`, `tracking.history`, `devices.manage`,
`geofences.manage`, `routes.*`, `jobs.*`, `alerts.*` siguen sembrados en
`permissions` sin tablas correspondientes — mismo trato: no inventar esquema
sin confirmar primero.

### Fase 2a — Fleet core (agregada en esta fase)

Siguiendo el roadmap de 195 puntos que definió el usuario para FLOTAA como
SaaS completo (fases 0–10), esta fase cubre "Fleet core": catálogo de
vehículos y operadores. Fase 0/1 (multitenancy) ya estaban completas desde
el arranque del proyecto.

Tablas nuevas, todas con RLS y triggers `set_updated_at`/`audit_trigger`:

- **`vehicle_types`**: catálogo de tipos de vehículo. `organization_id null`
  = default del sistema (sembrados: truck/van/pickup/car/trailer/other),
  `organization_id` propio = tipo personalizado de esa empresa. Select:
  default del sistema o de la propia org. Insert/update/delete de tipos
  propios: `has_permission(org, 'settings.manage')` (no existe un permiso
  `vehicle_types.manage` dedicado, se reutilizó el de configuración).
- **`vehicle_groups`**: grupos jerárquicos (`parent_group_id`) por
  organización, mismo permiso `settings.manage`.
- **`drivers`**: operadores/conductores. Mismo patrón que `locations`
  (soft delete, `active`). RLS con los permisos `drivers.create/edit/delete`
  ya sembrados desde el inicio.
- **`driver_licenses`**, **`driver_certifications`**: sub-recursos de un
  operador. Insert/update/delete gateados por `drivers.edit` (no se creó un
  permiso separado). **Sin UI todavía** — la tabla existe, el módulo
  Operadores no las edita aún.
- **`vehicle_driver_assignments`**: historial de qué operador tuvo cada
  vehículo (`starts_at`/`ends_at`), separado de `vehicles.assigned_driver_id`
  (que es solo el operador *actual*, para no depender de leer historial para
  saber quién trae la unidad hoy). Gateado por `vehicles.edit`. **Sin UI
  todavía**.
- **`attachments`**: archivos genéricos (`entity_type`/`entity_id`
  polimórfico) apuntando al bucket real de Supabase Storage `attachments`
  (privado). RLS de `storage.objects` exige que el primer segmento del path
  sea un `organization_id` al que el usuario pertenece — **la convención de
  path obligatoria es `<organization_id>/<entity_type>/<entity_id>/archivo`**,
  cualquier subida debe respetarla o la RLS la rechaza. Insert/select/delete
  solo requieren membresía de la organización (no hay permiso por-módulo a
  nivel de archivo; la autorización real vive en la fila que referencia el
  archivo). **Sin UI de carga todavía**.
- **`entity_documents`**: documentos con vencimiento (seguro, tarjeta de
  circulación, etc.), referencia opcional a `attachments`. Mismo trato:
  cualquier miembro de la org puede escribir. **Sin UI todavía**.

`vehicles` se extendió: `vehicle_type_id` (reemplazó la columna de texto
libre `vehicle_type`, migrada y eliminada), `vehicle_group_id`,
`assigned_driver_id`, `status` (texto libre con opciones sugeridas en
`VEHICLE_STATUSES`, no es un enum de Postgres — el propio roadmap pide no
asumir los mismos estados para todos los clientes; si más adelante se pide
un catálogo de estados personalizable por org, evaluar tabla dedicada en vez
de texto libre), `current_odometer`, `odometer_unit`, `fuel_type`, `notes`,
`image_url`.

**No construido en esta fase (deliberado, evitar sobre-ingeniería):** UI
para administrar `vehicle_types`/`vehicle_groups` personalizados, licencias,
certificaciones, historial de asignación vehículo-operador, ni carga de
archivos/documentos. `custom_field_definitions/values` y `saved_views`
(Fase 2b del roadmap) tampoco se construyeron — son frameworks genéricos
grandes, mejor esperar a que 2+ entidades reales los necesiten antes de
construirlos, para no especular.

## Sistema de diseño

- Tipografía: Inter (cargada en `index.html` desde Google Fonts).
- Tokens Tailwind v4 en `src/index.css` (`@theme`): `accent-50/500/600/700`
  (naranja, color de marca), `ink` (texto principal), y colores de estado
  `status-active/stopped/progress/delayed` (con su variante `-bg`) pensados
  para usarse en el futuro con vehículos/rutas/alertas — no usarlos para otra
  cosa que no sea estado operativo real.
- Iconos: `lucide-react`.
- Mapas: Leaflet + tiles de OpenStreetMap (sin API key). Componente genérico
  en `src/components/map/Map.tsx` (recibe `markers`), pensado para
  reutilizarse cuando exista tracking de vehículos.

## Estructura de carpetas

```
src/
  lib/supabase.ts          cliente único, tipado con Database
  types/database.ts        tipos generados (no editar a mano)
  context/                 AuthContext, OrgContext, PermissionsContext, ToastContext
  routes/ProtectedRoute.tsx
  layout/                  AppShell, Sidebar, Header, navConfig
  components/ui/           primitivos: Button, Input, Field, Drawer,
                            ConfirmDialog, Skeleton, EmptyState, ErrorState,
                            Pagination, ToastViewport
  components/Can.tsx       <Can permission="...">
  pages/auth/               login, registro, recuperar/restablecer password
  features/<módulo>/
    api/       funciones que llaman a supabase-js (única capa que lo hace)
    hooks/     useQuery/useMutation de TanStack Query sobre api/
    components/
    <Módulo>Page.tsx
```

`features/locations` (Sucursales) es el **patrón de referencia** para
cualquier CRUD nuevo: tabla densa con búsqueda/filtros/orden/paginado
server-side, alta y edición en `Drawer`, skeleton/empty/error states,
`ConfirmDialog` propio para borrado (soft delete vía `deleted_at`, ya que la
tabla lo contempla). Replicar esta estructura antes de inventar una nueva.

## Auth y organización activa

- `AuthContext` expone `session`/`user` desde `supabase.auth` + `onAuthStateChange`.
- `OrgContext` (dentro de `ProtectedRoute`) resuelve, en orden: 0 orgs →
  `OnboardingWizard` (llama a `create_organization()`), 1 org → entra directo
  y persiste, 2+ orgs → usa `profiles.active_organization_id` si es válido, si
  no cae al primero y lo persiste. El cambio de empresa (`OrgSwitcher` en el
  header, solo visible con 2+ orgs) escribe en `profiles`, nunca en
  localStorage.
- `PermissionsContext` carga los permisos del usuario en la organización
  activa (`organization_members → roles → role_permissions → permissions`) y
  expone `can(key)`. El componente `<Can permission="...">` oculta UI; los
  ítems del sidebar (`layout/navConfig.ts`) se filtran igual. Las políticas
  RLS son la autoridad real — `can()` solo controla qué se pinta.

## Variables de entorno

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env` (gitignored).
