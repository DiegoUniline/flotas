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
