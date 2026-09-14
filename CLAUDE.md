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
- **Cero datos falsos.** Nada de mocks, placeholders, ni datos inventados en
  pantallas reales. **Excepción explícita pedida por el usuario:** el menú
  completo del roadmap (`layout/navConfig.ts`) sí está siempre visible desde
  esta fase — los ítems de módulos no construidos abren una página
  "Próximamente" (`src/pages/ComingSoonPage.tsx`) en vez de datos simulados.
  Cada `NavItem` tiene `implemented: boolean`; al construir un módulo de
  verdad, cambiar a `implemented: true` y darle su propia ruta/página en
  `App.tsx` (que genera rutas automáticamente para todo lo que siga en
  `implemented: false`, no hay que tocar `App.tsx` a mano para los
  placeholders). Esto es la única excepción — sigue prohibido simular datos
  *dentro* de una pantalla ya construida.
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
para administrar `vehicle_types`/`vehicle_groups` personalizados.
`custom_field_definitions/values` y `saved_views` (Fase 2b del roadmap)
tampoco se construyeron — son frameworks genéricos grandes, mejor esperar a
que 2+ entidades reales los necesiten antes de construirlos, para no
especular.

### Ficha de operador + asignación + attachments (completado en esta fase)

Lo que arriba quedó pendiente sí se construyó:

- **`assign_vehicle_to_driver(p_vehicle_id, p_driver_id, p_notes)`** y
  **`unassign_vehicle(p_vehicle_id)`**: RPCs `SECURITY DEFINER` que hacen
  atómico el flujo de reasignar (cierran la asignación activa anterior en
  `vehicle_driver_assignments`, crean la nueva, y sincronizan
  `vehicles.assigned_driver_id`). No usar `update` directo desde el
  frontend sobre `vehicle_driver_assignments` para esto — se desincroniza
  `vehicles.assigned_driver_id`.
- **`features/attachments`**: capa reutilizable sobre el bucket privado
  `attachments`. **Convención de path obligatoria:**
  `<organization_id>/<entity_type>/<entity_id>/<timestamp>-<nombre>` — la
  RLS de `storage.objects` exige que el primer segmento sea un
  `organization_id` al que el usuario pertenezca (`uploadAttachment` ya lo
  arma así, no construir el path a mano). Como el bucket es privado, ver un
  archivo requiere `getAttachmentSignedUrl` (URL firmada, 1 hora), nunca una
  URL pública directa. Componente `<AttachmentUploader entityType entityId>`
  reutilizable para cualquier entidad — usado hoy en licencias y
  certificaciones de operador.
- `driver_licenses`/`driver_certifications`: CRUD completo dentro de la
  ficha de operador (`/operadores/:id`), cada registro con su propio
  `AttachmentUploader` (adjunto solo disponible al editar, porque necesita
  el `id` del registro ya guardado).
- Ficha de operador también muestra el vehículo asignado actual (vía
  `vehicles.assigned_driver_id`, no re-derivado de `vehicle_driver_assignments`
  para evitar una query extra) con historial de asignaciones debajo.

### Menú completo del roadmap (agregado en esta fase)

`layout/navConfig.ts` ya tiene los ~30 ítems de la navegación propuesta en el
punto 120 del roadmap (Operación/Flota/Mantenimiento/Costos/Seguridad/
Analítica/Configuración), no solo los 4 módulos reales. Cada `NavItem`:

- `implemented: true` (Centro de control, Vehículos, Operadores, Sucursales)
  → ruta real definida a mano en `App.tsx`.
- `implemented: false` (todo lo demás) → `App.tsx` genera su ruta
  automáticamente apuntando a `<ComingSoonPage title={item.label} />`; no
  hay que agregar nada en `App.tsx` al dejar un módulo como pendiente.
- `permission` es **opcional**: si se omite (caso de "Inicio"), el ítem es
  visible para cualquier miembro de la organización sin gate. Si se define,
  el sidebar lo oculta con `can(permission)` igual que siempre.

Varios ítems `implemented: false` usan un permiso **aproximado** porque el
módulo real (y su tabla) no existe todavía, así que no hay un permiso
`*.view` dedicado — está reutilizando el más cercano semánticamente
(documentado por si hace falta ajustarlo cuando se construya el módulo de
verdad):

- Dispositivos → `devices.manage`, Geocercas → `geofences.manage`,
  Refacciones → `maintenance.manage` (no hay permiso propio de refacciones).
- Inspecciones → `inspections.perform` (no existe `inspections.view`).
- Costos (vista agregada) → `reports.view`, Indicadores → `reports.view`.
- Incidentes → `alerts.view` (no existe permiso propio de incidentes).
- Documentos → `drivers.view` (la mayoría de documentos que ya existen en
  el esquema — `driver_licenses`/`entity_documents` — son de operador).
- Campos personalizados y Vistas → `settings.manage`.
- Integraciones y API → `api.manage`.
- Empresa → `organization.view`, Suscripción → `billing.manage`.

Al construir cualquiera de estos módulos en serio, revisar primero si el
permiso reutilizado sigue teniendo sentido o si conviene sembrar uno nuevo
en `permissions` (documentarlo aquí igual que con `vehicle_types`/`settings.manage`).

### Fase 4 — Operación: Clientes, Pedidos, Rutas y Centro de control real

Pedido explícito del usuario: construir "crear pedidos" ya, y rediseñar el
Centro de control con la estructura visual de una referencia (mapa
protagonista, KPIs, panel lateral, timeline de ruta) pero **sin inventar
tracking en vivo** — el movimiento del vehículo, velocidad, batería y
"actualizado hace Xs" siguen bloqueados por la misma razón de siempre: no
hay proveedor GPS elegido. Todo lo demás del rediseño usa datos reales.

Tablas nuevas (mismo patrón RLS que el resto: select por membresía de org,
write gateado por permiso, triggers `set_updated_at`/`audit_trigger`):

- **`customers`** + **`customer_locations`** (domicilios múltiples por
  cliente). No existe permiso `customers.*` sembrado — el write de ambas
  reutiliza `jobs.manage` (un cliente solo tiene sentido para crear
  pedidos). Ficha de cliente en `/clientes/:id` con domicilios como
  sub-recurso, mismo patrón que licencias de operador, incluyendo el botón
  "Usar mi ubicación".
- **`jobs`** (pedidos): entrega/recolección/servicio, con cliente,
  domicilio, operador y vehículo asignado, `amount numeric` — formatear
  siempre con `formatCurrency()` de `src/lib/format.ts` (Intl.NumberFormat,
  MXN hardcodeado por ahora — hay un TODO ahí para leer
  `organizations.currency` cuando el producto soporte multi-moneda real).
  RLS usa los permisos `jobs.view/manage/complete` que ya estaban
  sembrados desde el inicio.
- **`route_plans`** (ruta del día: operador + vehículo + sucursal base,
  `status` draft→planned→in_progress→completed/cancelled) y
  **`route_stops`** (paradas). Al agregar una parada desde un pedido
  (`addStopFromJob`), se copia un **snapshot** de nombre/dirección/lat/lng
  del `customer_location` del pedido hacia la parada — la parada no se
  recalcula si luego editas el domicilio del cliente, es intencional (la
  ruta del día no debe moverse retroactivamente). `route_plans` no tiene
  `deleted_at`: no se borran, se cancelan (`status = 'cancelled'`) porque
  tienen valor histórico. RLS: `routes.create` para crear rutas,
  `routes.assign` para editarlas/reasignar/gestionar paradas (reutilizado
  también para delete de `route_plans`, no hay permiso de borrado propio).

**Centro de control rediseñado** (`features/map/ControlMapPage.tsx`):
selector de fecha + selector de ruta (con buscador que filtra esa lista de
rutas por nombre/operador/vehículo, cliente-side) + 4 KPIs reales
(vehículos activos, rutas en curso hoy, pedidos entregados/programados,
paradas pendientes hoy — todo vía `features/map/api/controlApi.ts`). Mapa
con sucursales (pin default) + paradas de la ruta seleccionada (pin de
color por estado: gris pendiente, índigo en camino, verde completada —
`Map.tsx` ahora acepta `color` opcional por marcador vía `divIcon`). Panel
lateral al seleccionar una ruta: info + progreso (paradas completadas/total)
+ siguiente parada + link a la ficha completa de la ruta. Timeline
horizontal de paradas debajo del mapa. **No hay tarjeta de "alertas
activas" ni "ETA promedio"** — no existe motor de alertas (Fase 6 del
roadmap) ni tracking en vivo, así que no hay dato real que mostrar ahí;
agregarlas cuando esas piezas existan, no antes.

## Patrón de interacción estilo Odoo (agregado en esta fase — reemplaza el anterior)

Pedido explícito del usuario, con referencia directa a Odoo. Es el estándar
global nuevo: listas densas 90/10, barra universal de fecha+búsqueda+filtros,
vistas de detalle con edición en línea (nada de Drawer para crear/editar),
4 columnas etiqueta/valor, selectores relacionales con creación en contexto,
pestañas de información relacionada. **`features/locations` (Sucursales) ya
NO es el patrón de referencia** — lo es **`features/vehicles`** (`VehiclesPage`
+ `VehicleDetailPage`), la primera migración completa a este sistema.
Sucursales/Operadores/Clientes/Pedidos/Rutas siguen en el patrón viejo
(Drawer + formulario) y **hay que migrarlos al nuevo** siguiendo exactamente
la estructura de Vehículos — no eran incorrectos, son la fase anterior.

### Piezas compartidas (`src/components/ui`, `src/lib`, `src/hooks`)

- **`ListToolbar`** + **`DateRangeFilter`** + **`FilterPanel`**: la barra
  universal (fecha | buscador | filtros), en ese orden. `DateRangeFilter`
  usa `lib/dateRanges.ts` (presets Hoy/Ayer/Esta semana/Semana pasada/Este
  mes/Mes pasado/Este año/Rango personalizado/Todas las fechas) — cada
  módulo decide sobre qué columna de fecha filtra (pasa `dateRange` +
  `onDateRangeChange`, y en su `fetch...` aplica `.gte()/.lte()` sobre esa
  columna; Vehículos usa `created_at` por defecto). `FilterPanel` es
  genérico por config: `FilterFieldDef[]` (campo+tipo: text/number/date/
  select/boolean, con sus operadores en `lib/queryFilters.ts` →
  `OPERATORS_BY_TYPE`) y `GroupFieldDef[]` para "Agrupar por". Los filtros
  activos se aplican con `applyFilters(query, appliedFilters)` — genérico,
  funciona sobre cualquier query de Supabase. Las etiquetas de filtros
  activos y "Limpiar todo" ya vienen incluidas en `ListToolbar`.
- **Agrupar por — limitación real, documentada a propósito:** agrupar
  bucketiza en el cliente las filas ya traídas (`lib/groupRows.ts`), no hace
  un `GROUP BY` en la base. Para que un grupo no quede cortado entre
  páginas, cuando `groupBy` está activo el fetch trae un lote más grande
  (`GROUPED_PAGE_SIZE = 300` en `vehiclesApi.ts`) en vez de paginar, y la
  paginación se oculta. Con cientos de registros por organización (el caso
  típico PyME) es correcto; si algún módulo crece más, revisar antes de
  copiar el patrón tal cual.
- **`TableScrollArea`**: da el 90/10 real — el `<thead>` de cada tabla debe
  llevar `className="sticky top-0 z-10"` (ver `VehiclesTable.tsx`). Requiere
  que la página raíz sea `<div className="flex h-full flex-col">` con el
  header/toolbar en `shrink-0` y el contenedor de la tabla en
  `flex-1 min-h-0 overflow-hidden`. Esto solo funciona porque **`AppShell`
  cambió `<main>` de `overflow-y-auto` a `overflow-hidden`** — cada página
  ahora es responsable de su propio scroll. Las páginas que NO usan el
  layout de lista (fichas, "Próximamente") se envuelven en
  **`<PageScroll>`** (`h-full overflow-y-auto`) para no quedar cortadas;
  ya se aplicó a todas las páginas existentes menos Vehículos.
- **`InlineField`**: el campo "se ve como texto, es un input real". No es
  un div que se cambia por un input al hacer clic — siempre es el control
  real (input/select/textarea) con borde transparente en reposo y borde
  normal al enfocar. Así Tab funciona nativo entre campos sin lógica
  adicional. `readOnly` para campos calculados/sin permiso (se ve texto
  plano, nunca un input deshabilitado con aspecto de campo vacío).
- **`DetailGrid` + `DetailField`**: cada `DetailField` es su propio par
  etiqueta(120px)/valor(1fr); `DetailGrid` los acomoda 2 por fila
  (`sm:grid-cols-2`) → el efecto visual es Etiqueta|Valor|Etiqueta|Valor.
  `full` hace que un campo ocupe la fila completa (para notas, texto largo).
  En móvil cae a 1 columna automáticamente.
- **`SaveDiscardBar`**: no se autoguarda por campo. Cada detalle mantiene
  un `draft` en estado local; el botón aparece solo si `draft` difiere del
  original (`dirty`). Guardar dispara la mutación real; Descartar revierte
  el draft (o navega atrás si es un registro nuevo sin guardar). Hay un
  guard de `beforeunload` para cerrar pestaña/recargar con cambios sin
  guardar. **Limitación real:** no hay bloqueo de navegación interna
  (sidebar, atrás del navegador) más allá del botón "volver" explícito de
  cada ficha — bloquear cualquier navegación de React Router requeriría
  migrar de `<BrowserRouter>` a `createBrowserRouter` (data router) para
  poder usar `useBlocker`, que no se hizo en esta fase.
- **`Tabs`**: pestañas simples controladas (`items`, `active`, `onChange`),
  con contador opcional. Cada ficha decide qué pestañas le aplican — nunca
  mostrar una pestaña sin datos reales detrás.
- **`RelationSelect`**: combobox genérico con búsqueda real en base
  (`onSearch: (query) => Promise<RelationOption[]>`, `RelationOption =
  {id, label}` — si la tabla de origen no tiene esa forma exacta, mapear
  en el sitio de uso, ver `VehicleDetailPage.tsx`) y creación en contexto
  opcional vía `renderCreateForm` (abre un `Drawer` con el formulario que
  le pases; al llamar `onCreated({id,label})` se selecciona automáticamente
  y se cierra todo). El draft del registro original NUNCA se pierde durante
  este flujo porque la creación vive en un Drawer superpuesto, no en una
  navegación — el estado del padre sigue montado. `onSearch` se guarda en
  un `ref` internamente (no en las deps del efecto) porque casi siempre es
  un closure nuevo en cada render del padre; si no fuera así, se dispararía
  una búsqueda de más en cada tecleo de cualquier otro campo del formulario.
  Reutilizar formularios de creación existentes en vez de duplicarlos: ver
  `LocationQuickCreate.tsx`/`DriverQuickCreate.tsx` (envuelven
  `LocationForm`/`DriverForm` + su mutación de creación real) y
  `VehicleTypeQuickForm.tsx`/`VehicleGroupQuickForm.tsx` (catálogos
  simples, solo nombre).
- **Caso especial — relaciones con lógica de negocio propia:** el operador
  asignado a un vehículo (`vehicles.assigned_driver_id`) **no** pasa por el
  draft/Guardar genérico — usa `VehicleAssignmentField.tsx`, un
  `RelationSelect` sin `renderCreateForm` que al seleccionar llama de
  inmediato a las RPCs `assign_vehicle_to_driver`/`unassign_vehicle` (ver
  sección de Fase 4 arriba). Si se hubiera dejado como campo normal del
  draft, un `update` directo habría desincronizado
  `vehicle_driver_assignments`. Cualquier relación con un efecto de negocio
  además de "guardar el FK" necesita este mismo tratamiento: sacarla del
  draft genérico y resolverla con su propia mutación inmediata.

### Documentos del vehículo (lo que pediste sobre seguro/póliza)

`features/vehicles/api/vehicleDocumentsApi.ts` usa la tabla genérica
`entity_documents` ya existente, con `entity_type = 'vehicle'`. Tipos
sugeridos en `VEHICLE_DOCUMENT_TYPES` (seguro, tarjeta de circulación,
verificación, permiso, otro) — texto libre, no enum de Postgres, mismo
criterio que en el resto del esquema. Pestaña "Documentos" en la ficha del
vehículo, cada documento con su propio archivo real adjunto vía
`AttachmentUploader` (`entity_type: 'vehicle_document'`, `entity_id` = id
del documento). Mismo patrón exacto que licencias/certificaciones de
operador — replicarlo para otras entidades (clientes, operadores ya lo
tienen) sin inventar uno nuevo.

### Pendiente inmediato

Migrar al patrón nuevo, en este orden sugerido (del más simple al más
grande): Sucursales → Operadores (ya tiene sub-recursos, buena prueba de
Tabs) → Clientes → Rutas. **Pedidos ya se migró** (ver sección de
paquetería abajo).

### `DetailSection` + `HistoryPanel` (agregado en esta fase)

Pedido explícito del usuario con referencia visual: las fichas de detalle
no son un único bloque de campos — se agrupan en tarjetas con título y,
a la derecha, un panel fijo con el historial real de cambios del registro.

- **`DetailSection`** (`components/ui/DetailGrid.tsx`, junto a
  `DetailGrid`/`DetailField`): tarjeta con borde, título y descripción
  opcional, contiene un `DetailGrid` adentro. Agrupar campos relacionados
  (p. ej. en Vehículos: "Identificación", "Estado y asignación",
  "Operación", "Notas"; en Pedidos: "Datos del pedido", "Remitente y
  recolección", "Destinatario y entrega", "Paquete y cobro",
  "Instrucciones"). No inventa datos — sigue siendo el mismo
  `DetailField` de siempre, solo con jerarquía visual.
- **`HistoryPanel`** (`components/audit/HistoryPanel.tsx`): columna fija
  de 320px a la derecha de la ficha (`w-80 shrink-0 border-l`), gateada
  con `<Can permission="audit.view">` (el rol Consulta/Administrador/
  Propietario lo tiene sembrado; si el usuario no tiene el permiso el
  panel simplemente no se pinta — RLS de `audit_logs` ya lo bloquea de
  cualquier forma). Lee de la tabla real `audit_logs` (ya poblada por los
  triggers `audit_trigger()` que **todas** las tablas del proyecto ya
  tienen desde el inicio) vía `features/audit/api/auditLogApi.ts` +
  `features/audit/hooks/useAuditLog.ts`, filtrando por
  `entity_type`/`entity_id` del registro actual. `lib/auditDiff.ts`
  calcula qué campos cambiaron entre `old_values`/`new_values` (ignora
  `id`/`organization_id`/timestamps/`created_by`) para mostrar
  "campo: antes → después" por cada evento de `update`. Datos 100% reales,
  nada simulado. Solo se agregó a Vehículos y Pedidos por ahora — agregar
  el mismo bloque (`Can audit.view` + `HistoryPanel entityType=".." `) al
  resto de fichas cuando se migren.
- El contenedor de la ficha pasó de `mx-auto max-w-3xl` (centrado, fondo
  gris alrededor) a `flex-1` con `bg-white` de borde a borde y
  `max-w-4xl` sin centrar — el contenido queda pegado a la izquierda como
  pidió el usuario, el `HistoryPanel` ocupa la derecha.

### Pedidos como guía de paquetería (agregado en esta fase)

Pedido explícito del usuario: el módulo de Pedidos debe servir para
paquetería en general (tipo FedEx/DHL/Estafeta), no solo "entrega con
cliente y domicilio". Se extendió `jobs` (migración
`add_courier_fields_to_jobs`) y se agregó la tabla `job_packages`:

- **Remitente/destinatario**: `sender_name`/`sender_phone` y
  `receiver_name`/`receiver_phone` en `jobs` — texto libre, independiente
  de si el remitente/destinatario son el mismo `customer_id` (la cuenta
  que se factura no siempre es la persona de contacto de ese envío
  puntual).
- **Recolección con dos modos** (`origin_type`, check `pickup`|`branch`):
  `pickup` = pasamos a recoger al domicilio del cliente
  (`origin_customer_location_id`, FK a `customer_locations` — reutiliza
  el mismo catálogo de domicilios del cliente, con `RelationSelect` +
  creación en contexto vía `CustomerLocationQuickCreate`); `branch` = el
  remitente lo entrega en una sucursal propia (`origin_branch_location_id`,
  FK a `locations`, `RelationSelect` de solo búsqueda ya que las
  sucursales no se crean desde aquí). La ficha muestra un solo campo de
  ubicación que cambia de tipo según `origin_type`.
- **Entrega**: sigue siendo el `customer_location_id` que ya existía
  (domicilio del cliente, con lat/lng reales para el mapa — no se
  duplicó esa dirección en `jobs`). `receiver_name`/`receiver_phone` son
  la persona específica de ese envío, puede diferir del contacto guardado
  en el domicilio.
- **Contenido y cobro**: `content_description` (qué se envía),
  `declared_value` (valor declarado), `cod_amount` (cobro contra
  entrega/pago contra entrega), además del `amount` que ya existía
  (monto a cobrar por el servicio). `received_by_name` (quién recibió) y
  `received_at` — este último **no se captura a mano**: al guardar la
  ficha, si `status` pasa a `delivered` y no tenía `received_at`, se
  sella automáticamente con la hora del guardado (`JobDetailPage.tsx`,
  función `handleSave`).
- **`job_packages`** (tabla nueva, mismo patrón RLS que el resto —
  `organization_id` propio, no join al padre — gateada por
  `jobs.manage`): un pedido puede tener varios bultos, cada uno con
  `quantity`, `weight_kg`, `length_cm`/`width_cm`/`height_cm`,
  `description`, `declared_value`. Pestaña "Paquetes" en la ficha
  (`JobPackagesTab.tsx`) con **filas editables directamente** (sin Drawer,
  a diferencia de licencias/documentos — son líneas simples tipo hoja de
  cálculo, cada celda hace commit en `onBlur`). Se calcula y muestra
  **peso volumétrico** por fila (`L×A×H/5000`, fórmula estándar de
  paquetería, `lib` vive en `jobPackagesApi.ts` como
  `volumetricWeightKg()`) y totales de piezas/peso real/peso volumétrico
  al pie — todo derivado de números reales que captura el usuario, nunca
  inventado.
- **Deliberadamente no construido:** motor de tarifas (cobrar
  automáticamente por peso/tamaño con una tabla de precios). Cada
  paquetería tiene su propio esquema de tarifas/zonas/contratos por
  cliente — construirlo sin que el usuario defina las reglas sería
  inventar lógica de negocio. Por ahora `amount` sigue siendo captura
  manual; cuando el usuario decida el esquema de tarifas se puede sumar
  un cálculo automático a partir de `job_packages` (ya trae el peso real
  y volumétrico listos para eso).

### GPS de recolección/entrega y seguro (agregado en esta fase)

Pedido explícito del usuario, terminando el módulo de paquetería.
Migración `add_gps_capture_and_insurance_to_jobs`, extiende `jobs`:

- **`pickup_latitude`/`pickup_longitude`/`pickup_captured_at`** y
  **`delivery_latitude`/`delivery_longitude`/`delivery_captured_at`**:
  **no es tracking en vivo ni requiere proveedor GPS** — es la
  geolocalización del navegador (`navigator.geolocation`, el mismo
  mecanismo que "Usar mi ubicación" en `CustomerLocationForm`) capturada
  como una foto puntual en el momento real de recolectar/entregar, prueba
  de dónde ocurrió cada evento (distinto de la dirección registrada del
  domicilio, que es solo la referencia). Componente reutilizable
  `components/ui/GpsCaptureField.tsx` (coords + hora capturada + botón
  "Capturar ubicación actual" + **mapa Leaflet con pin arrastrable** para
  corregir la posición a mano si el GPS del dispositivo se equivocó —
  clic en el mapa también reposiciona el pin). El fix de íconos default
  de Leaflet (rutas rotas al bundlear con Vite) se extrajo a
  `lib/leafletIconFix.ts` para reusarlo aquí y en `components/map/Map.tsx`
  en vez de duplicarlo. El campo "GPS de recolección" en la
  ficha de Pedido **solo se muestra cuando `origin_type = 'pickup'`**
  (si el remitente lo entrega en sucursal no aplica recolección con GPS,
  tal como pidió el usuario con "cuando aplica"); "GPS de entrega" siempre
  se muestra. Esto sigue bloqueado/diferente de la integración de
  rastreo vehicular en vivo (`vehicles.last_latitude/longitude`), que
  sigue esperando que el usuario elija proveedor — no confundir ambas.
- **`has_insurance` (boolean) + `insurance_percentage` (numeric)**:
  seguro opcional del envío, expresado como % del `declared_value`. El
  importe del seguro **no se guarda**, se calcula en la UI
  (`declared_value * insurance_percentage / 100`, formateado con
  `formatCurrency`) para que nunca quede desincronizado si se edita el
  valor declarado después. Si en algún momento se necesita cobrar el
  seguro por separado (línea de cobro propia, póliza con aseguradora
  real, etc.), evaluar entonces si conviene persistir el monto — no se
  inventó esa parte.

### Crear pedido: wizard en ventana emergente, no la ficha completa (agregado en esta fase)

Pedido explícito del usuario: crear un pedido desde cero con las 4
secciones completas en una sola página (Odoo-style, sin Drawer) obligaba
a mucho scroll antes de terminar. **Excepción deliberada al patrón
general "nunca modales para formularios largos":** crear un pedido nuevo
(`/pedidos/nuevo`) ahora abre un wizard en `Modal` (nuevo componente
`components/ui/Modal.tsx` — centrado y ancho, `max-w-2xl`, a diferencia
de `Drawer` que es lateral y angosto `max-w-md`) con 4 pasos = las mismas
4 `DetailSection` de siempre (Datos del pedido → Remitente y recolección
→ Destinatario y entrega → Paquete y cobro/instrucciones), navegados con
Atrás/Siguiente y puntos de progreso. **Editar un pedido existente sigue
siendo la ficha completa de siempre** (todas las secciones + `Tabs` de
Paquetes + `HistoryPanel`) — el wizard es solo para la creación, donde
GPS/paquetes no aplican todavía (necesitan el `id` del pedido ya
guardado). `JobDetailPage.tsx` construye las 4 secciones una sola vez
como variables (`sectionDatos`, `sectionOrigen`, `sectionDestino`,
`sectionPaquete`) y las reusa tanto en el wizard (`isNew`, una por paso)
como en la ficha completa (`!isNew`, las 4 seguidas) — mismo estado
(`draft`/`handleSave`), sin duplicar lógica. El wizard respeta el mismo
guard de cambios sin guardar (`handleBack` con `ConfirmDialog`) que la
ficha normal. Si algún otro módulo con muchos campos (Clientes, Rutas)
tiene la misma queja de scroll al crear, replicar este mismo patrón en
vez de inventar uno nuevo — pero solo para creación, no para edición.

### Número de pedido automático y consecutivo (agregado en esta fase)

Pedido explícito del usuario: `job_number` ya no se captura a mano — se
genera solo, alfanumérico, consecutivo por organización y con la fecha al
final para que sea fácil de leer: **`PED-00001-140926`** (`PED-` +
consecutivo de 5 dígitos + `DDMMYY`).

- Migración `auto_generate_job_number`: tabla
  `job_number_counters (organization_id pk, last_number)` — sin policies
  (no se consulta nunca desde el cliente, solo la usa la función de
  abajo) — más `generate_job_number(p_organization_id)` (`SECURITY
  DEFINER`, hace `UPDATE ... RETURNING` atómico sobre el contador, así
  que es seguro con inserciones concurrentes) y un trigger
  `trg_jobs_set_job_number` (`BEFORE INSERT on jobs`) que llama a esa
  función **solo si `job_number` viene `null`** y arma el string. También
  se agregó `UNIQUE (organization_id, job_number)` en `jobs` como
  refuerzo. El consecutivo vive en el trigger de base de datos a
  propósito, no en el frontend — así es consistente sin importar desde
  dónde se inserte un pedido.
- **El frontend ya no manda `job_number`** en ningún `insert`/`update`
  (`JobDetailPage.tsx`, `handleSave`) — lo deja fuera del payload para
  que el trigger lo genere, y nunca lo reescribe después. El campo en la
  ficha (`sectionDatos`) pasó de `InlineField` editable a texto de solo
  lectura: en modo creación muestra "Se genera automáticamente al
  guardar" (todavía no existe, se ve hasta después de guardar), en modo
  edición muestra el valor real, nunca editable.

### Buscador de direcciones en el mapa de GPS + mapa más grande (agregado en esta fase)

Pedido explícito del usuario: poder escribir una dirección/colonia/
municipio/estado y que el mapa salte ahí, en vez de solo depender del
GPS del dispositivo o de tocar el mapa a ciegas. `GpsCaptureField.tsx`
ahora tiene un buscador arriba del mapa (debounce 400ms, mínimo 3
caracteres) que geocodifica con **Nominatim** (el geocodificador
gratuito de OpenStreetMap, sin API key — mismo criterio ya usado para
los tiles del mapa), acotado a México (`countrycodes=mx`); seleccionar
un resultado de la lista posiciona el pin igual que capturar GPS o
tocar el mapa. **Nota de escala:** Nominatim pide uso ligero (~1
req/seg de fair use); si el volumen de la app crece, evaluar
self-host de Nominatim o un proveedor con cuota (Mapbox/Google) — no
se hizo esa evaluación en esta fase, es la opción correcta para
empezar sin costo. El mapa también creció de `h-64 w-64` (256px) a
`h-[420px] w-full` — deja de ser cuadrado pequeño para aprovechar el
ancho completo del campo, más útil ahora que hay buscador y resultados
arriba.

### Campos obligatorios marcados con asterisco + validación (agregado en esta fase)

Pedido explícito del usuario: si un campo se genera solo (número de
pedido), no debe pedirse ni mostrarse como paso — se quitó del wizard de
creación (`sectionDatos`, solo se muestra ya en modo edición, de solo
lectura). Y los campos realmente obligatorios deben marcarse con
asterisco y no dejar guardar sin ellos.

- **`DetailField`** ganó `required` (asterisco rojo junto a la etiqueta)
  y `error` (mensaje rojo debajo del campo) — genérico, cualquier ficha
  nueva puede usarlo.
- **Pedidos**: obligatorios **Cliente**, **domicilio/sucursal de
  recolección** (el que aplique según `origin_type`), **Destinatario**,
  **Domicilio de entrega** — elegidos porque sin ellos el pedido no es
  un envío real y procesable, no por una restricción de la base de
  datos (`jobs` no tiene `NOT NULL` en estos campos a propósito, para no
  bloquear a futuro un flujo de captura parcial/borrador). La validación
  vive en `JobDetailPage.tsx`: `validateStep(i)` revisa el paso i,
  `validateAll()` revisa los tres primero antes de guardar. El botón
  "Siguiente" del wizard valida el paso actual antes de avanzar;
  "Crear pedido"/Guardar valida todo y, si falta algo, salta al primer
  paso con error (`setStep`) en vez de guardar a medias.
- **Vehículos**: obligatorio solo **Tipo** (`vehicle_type_id`) — este sí
  es `NOT NULL` real en la tabla `vehicles` (sin default), así que sin
  esta validación el intento de guardar tronaba en la base de datos con
  un error genérico; ahora se avisa antes de mandar la petición.
- Patrón para replicar en otras fichas: estado `errors` (`Record<string,
  string>`), `update()` limpia el error de esa llave al cambiar el
  valor, y `handleSave` valida antes de armar el payload.

### `InlineField` tipo `buttons`: menos clics en selects de pocas opciones (agregado en esta fase)

Pedido explícito del usuario señalando el select de "Tipo" en Pedidos:
un `<select>` nativo son 2 interacciones (abrir + elegir); con pocas
opciones eso es fricción de más. Nuevo tipo `type="buttons"` en
`InlineField` (mismo `options` que `select`): fila de píldoras, la
activa en `accent-500` relleno, clic directo = 1 interacción. Aplicado
donde el select tenía pocas opciones (revisé todos los `InlineField
type="select"` del patrón nuevo, no solo el que se pidió, por el "analiza
todo y optimiza"):

- Pedidos: **Tipo** (4), **Prioridad** (4), **Recolección** (2 —
  pickup/sucursal).
- Vehículos: **Estado** (6), **Unidad** de odómetro (2 — km/mi).

**Deliberadamente sigue como `select` nativo**: Estado de pedidos
(`JOB_STATUSES`, 8 opciones) — con esa cantidad, una fila de botones
estorba más de lo que ayuda; un dropdown sigue siendo mejor UX ahí.
Regla para el futuro: **≤6 opciones → `buttons`, más → `select`**. Los
selects de los formularios viejos en `Drawer` (Sucursales, Operadores,
Clientes, Rutas) no usan `InlineField` — no se tocaron en esta pasada,
aplicar el mismo criterio cuando se migren al patrón nuevo.

### Rediseño del wizard: sidebar de pasos en vez de modal casi-pantalla-completa vacío (agregado en esta fase)

El usuario pidió el modal "casi pantalla completa" y, al verlo, señaló
correctamente que se veía mal: una sola tarjeta de campos flotando en un
mar de blanco abajo, porque el contenido de cada paso no llenaba una caja
forzada a `95vh`. Corrección de diseño (no solo devolver el tamaño
anterior): **`Modal` vuelve a tener alto automático** (`max-h-[88vh]`,
ya no `h-[95vh]` fijo) — se ajusta al contenido de cada paso en vez de
dejar espacio muerto, `max-w-5xl` de ancho. Y el wizard de pedido ahora
usa ese ancho con propósito: un **sidebar vertical de pasos** a la
izquierda (números en círculo, ✓ en los completados, resaltado el
actual, clic en cualquiera para saltar directo a ese paso) en vez de los
puntitos de progreso en el footer — patrón estándar de wizard (Stripe
checkout, onboarding de apps SaaS), no un experimento nuevo. El footer
conserva Atrás/Cancelar y Siguiente/Crear pedido, con "Paso X de 4" como
texto discreto en medio.

### Wizard de "Nuevo pedido": más ancho, no se cierra por accidente, sobrevive a un recargo (agregado en esta fase)

Pedido explícito del usuario tras ver el wizard funcionando:

- **`Modal`** ahora tiene `closeOnBackdrop` (default `true`); el wizard lo
  pasa en `false` — ni el fondo oscuro ni Escape lo cierran, solo el botón
  × o "Cancelar" del footer (ambos pasan por `handleBack`, que ya
  pregunta con `ConfirmDialog` si hay cambios sin guardar). Evita perder
  el progreso por un clic fuera del modal. `Modal` también creció de
  `max-w-2xl`/`max-h-[85vh]` a `max-w-4xl`/`max-h-[90vh]`, con más
  padding y el título en `text-lg` — más grande y fácil de leer.
- **Persistencia del borrador en `sessionStorage`** (`JobDetailPage.tsx`,
  helpers `loadWizardDraft`/`saveWizardDraft`/`clearWizardDraft`, llave
  `flotaa:job-wizard-draft`): mientras se crea un pedido (`isNew`), cada
  cambio de `draft`/`step` se guarda ahí; al montar el wizard se
  restaura si existe. Así un recargo accidental de la pestaña (F5,
  actualizar el navegador) no pierde lo que llevaba escrito — antes solo
  había un `beforeunload` que pregunta "¿seguro que quieres salir?" pero
  si el usuario aceptaba, todo se perdía igual. Se limpia explícitamente
  al crear el pedido con éxito, o al confirmar "Salir sin guardar" — es
  contenido de formulario sin guardar, no config/preferencia, así que
  **no aplica** la regla general de "nada de `localStorage`" (esa es
  para permisos/config de organización, ver el bullet correspondiente
  arriba); se usa `sessionStorage` en vez de `localStorage` a propósito,
  para que no sobreviva a cerrar la pestaña. Si se necesita el mismo
  comportamiento en otro wizard futuro, replicar el mismo patrón.

### Bug real encontrado: ruta estática `/nuevo` pisaba el param `:id` (corregido en esta fase)

**Causa raíz de la pantalla en blanco al crear pedidos** (y del mismo bug,
no reportado todavía, en "Nuevo vehículo"): `App.tsx` tenía DOS rutas para
el mismo componente — `vehiculos/nuevo` (estática) y `vehiculos/:id`
(dinámica), mismo patrón en `pedidos`. React Router prioriza la ruta
estática por ser más específica, así que al navegar a `/pedidos/nuevo` la
ruta que hacía match era la **estática**, que no tiene segmento `:id` —
`useParams()` devolvía `id: undefined`, no `id: 'nuevo'`. Como
`isNew = id === 'nuevo'` daba `false`, ni el wizard ni el formulario se
mostraban: solo el encabezado de la ficha, sin contenido, sin ningún
error de React (por eso "pantalla en blanco" sin nada en consola).
**Corrección:** se eliminaron las rutas estáticas `vehiculos/nuevo` y
`pedidos/nuevo` en `App.tsx` — con solo la ruta dinámica `:id`, navegar a
`/pedidos/nuevo` hace match ahí y `id` sí llega como el string literal
`'nuevo'`. **Nunca declarar una ruta estática `<módulo>/nuevo` junto a
`<módulo>/:id` para el mismo componente** — basta la dinámica, que ya
captura `'nuevo'` como valor de `id`. Si se migra otro módulo a este
patrón (crear vía ruta en vez de Drawer), verificar que solo exista la
ruta `:id`.

### Error boundary global (agregado en esta fase)

La app **no tenía ningún React error boundary** — cualquier excepción de
render no capturada tumbaba todo el árbol de React y dejaba la pantalla
en blanco sin ningún mensaje (reportado por el usuario al crear un
pedido). Se agregó `src/components/ErrorBoundary.tsx` envolviendo toda
la app en `main.tsx` (fuera de `QueryClientProvider`/`BrowserRouter`):
si algo truena, ahora se ve un mensaje con el error real + botón
Recargar, en vez de blanco total. Esto no corrige la causa raíz de
ningún bug puntual — es la red de seguridad para que un error futuro sea
diagnosticable (leer el mensaje en pantalla o la consola) en vez de
silencioso.

### Centro de control rediseñado otra vez, contra una referencia visual real (agregado en esta fase)

Pedido explícito del usuario con una captura de pantalla de referencia
("Routely"). Se llevó el diseño lo más cerca posible **con datos 100%
reales** — lo que la referencia mostraba y no existe como dato real en
FLOTAA (tracking en vivo por vehículo, velocidad, batería, ETA, badges de
estado "En ruta"/"Detenido" por unidad, y el motor de alertas) **se omitió
a propósito**, mismo criterio de siempre (bloqueado por no haber proveedor
GPS ni motor de alertas — Fase 6 del roadmap, no construido).

Lo que sí se construyó, todo con datos reales:

- **Filtros en pastilla** (fecha/ruta/repartidor con ícono) en vez de
  controles planos — mismo `<input type="date">`/`<select>` nativos por
  dentro, solo el contenedor cambió. Se agregó **filtro por repartidor**
  (nuevo, derivado de `route_plans.driver_id` de las rutas del día, sin
  query adicional).
- **KPIs con tendencia real** (`features/map/api/controlApi.ts`,
  `fetchControlKpis` ahora también trae los mismos conteos del día
  anterior): badge ↑/↓ con % de cambio en "Rutas en curso" y "Pedidos
  entregados" (comparación día vs. día anterior, real). **Deliberadamente
  sin badge de tendencia** en "Vehículos activos" (el tamaño de flota activa
  no varía de forma comparable día a día, un % ahí sería ruido, no una
  tendencia real) ni en "Paradas pendientes" (backlog del día, no una serie
  comparable). No se agregaron las tarjetas "Alertas activas" ni "ETA
  promedio" de la referencia — no existe ese dato.
- **`components/map/Map.tsx`**: toggle **Mapa/Satélite** (Esri World
  Imagery, gratuito sin API key, mismo criterio que los tiles de OSM),
  **barra de escala** (`L.control.scale()`), botón de **"mi ubicación"**
  (geolocalización del navegador, mismo mecanismo que en
  `GpsCaptureField`) y **polyline** opcional que conecta en secuencia las
  paradas reales de la ruta seleccionada (`route_stops.sequence` con sus
  coordenadas reales — no es una ruta calculada/optimizada, es la
  secuencia ya guardada). Leyenda de colores por estado de parada debajo
  del mapa.
- **Panel de la unidad** (al seleccionar una ruta): avatar real
  (`drivers.photo_url`, con iniciales como fallback), nombre del operador,
  vehículo, "Pedido actual" (del `job` de la parada en curso/siguiente vía
  `route_stops.jobs`), "Siguiente parada" con dirección real, progreso de
  entregas con barra. Botones **"Ver ruta"** y **"Llamar"** (`tel:` con
  `drivers.phone` real, oculto si el operador no tiene teléfono
  capturado). **Sin botón "Reasignar"** — no existe una mutación de
  reasignación rápida construida para rutas (si se pide, construirla como
  su propia acción, no simularla) y **sin badge de estado en vivo/ETA/
  velocidad/batería** en este panel, mismo bloqueo de siempre. Se
  extendió `ROUTE_PLAN_SELECT`/`RoutePlanWithRelations` en
  `routePlansApi.ts` para traer `drivers.phone`/`drivers.photo_url` y
  `vehicles.image_url` (no se usa `image_url` todavía, queda listo para
  cuando se quiera mostrar la foto del vehículo).
- **Timeline de paradas** rediseñado como stepper conectado real (antes
  era una fila de chips con "→"): íconos de estado (check verde
  completada, punto índigo en camino, punto gris pendiente) unidos por una
  línea de progreso, con la hora real de cada evento
  (`route_stops.completed_at`/`arrived_at`/`estimated_arrival_at`, el
  primero que exista) en vez de solo la etiqueta de estado.

**No se tocó** el buscador universal "⌘K" de la referencia (busca
repartidor/vehículo/pedido desde el header) — es una función de nivel de
app (barra superior global), no de esta página, y requeriría un endpoint
de búsqueda cruzada entre 3 tablas que no se ha pedido todavía; el
buscador de esta página sigue filtrando solo las rutas del día, ahora con
estilo de pastilla para que combine visualmente.

### Datos de prueba: 15 pedidos (agregado en esta fase)

Pedido explícito del usuario: sembrar pedidos de prueba en la base real
para poder probar el módulo y el Centro de control con volumen. Se
insertaron directo por SQL (`execute_sql`, no es cambio de esquema por lo
que no aplicó `apply_migration`): 6 `customers` + 8 `customer_locations`
(negocios y domicilios de Autlán de Navarro, Jal., coordenadas reales de
la zona) y 15 `jobs` (`PED-00002` a `PED-00016`, el consecutivo lo generó
el trigger real, no se mandó a mano) con estatus/prioridad/fecha variados,
algunos con operador+vehículo asignado, seguro, cobro contra entrega y
`received_at` en los ya entregados. Son datos de prueba reales insertados
en filas reales de la organización activa (no es una pantalla simulando
datos) — si se necesita limpiarlos más adelante, son los `customers` con
nombre `Ferretería El Tornillo`/`Farmacia San Rafael`/`Abarrotes La
Central`/`Distribuidora Citrícola del Sur`/`Papelería Escolar Autlán`/
`Refaccionaria El Motor` y sus `jobs`/`customer_locations` relacionados.

### Bug real: el Centro de control no mostraba ningún pedido sin ruta asignada (corregido en esta fase)

Reportado por el usuario después de sembrar los 15 pedidos de prueba
("en centro de control no se ve nadaaaa... nada de los pedidos"). Causa
real: el mapa y las tarjetas del Centro de control solo pintaban paradas
(`route_stops`) de la ruta seleccionada — un pedido sin ruta/parada
asignada (el caso de los 15 de prueba, y de cualquier pedido recién
creado) era invisible ahí aunque sí existiera y sí apareciera en el
módulo Pedidos. No era falta de datos, era que la pantalla no los leía.

- **`features/map/api/controlApi.ts`**: nueva `fetchDayJobs(organizationId,
  date)` — trae los pedidos programados de la fecha seleccionada con el
  domicilio real de entrega (`customer_locations!jobs_customer_location_id_fkey`,
  con el hint de FK explícito porque `jobs` tiene dos relaciones a
  `customer_locations` — `customer_location_id` y
  `origin_customer_location_id` — y sin el hint PostgREST responde
  "more than one relationship was found" y la query truena en silencio,
  que es casi seguro por qué en un intento inicial de este mismo fix la
  tarjeta seguía viéndose vacía). Hook `useDayJobs(date)` en
  `hooks/useControlMap.ts`.
- **Mapa**: ahora también grafica un marcador por cada pedido del día con
  coordenadas reales de entrega, coloreado por `status` real del pedido
  (`JOB_STATUS_COLOR`, mismos tonos que la tabla de Pedidos), **siempre
  visible** — no solo cuando hay una ruta seleccionada. La leyenda del
  mapa ahora es "Pedidos" (con los 8 estados reales de `JOB_STATUSES`) y,
  solo si hay una ruta seleccionada, agrega también "Paradas" al lado.
- **Tarjeta "Pedidos del día"** (nueva, siempre visible debajo del
  mapa/panel de ruta): lista real de los pedidos de la fecha
  seleccionada — número, cliente, domicilio, badge de estado, monto
  (`formatCurrency`) — cada fila linkea a `/pedidos/:id`. Da visibilidad
  inmediata de "sí se guardó" sin depender de que el pedido ya tenga ruta.

## Formato de fechas (agregado en esta fase)

Pedido explícito del usuario: toda fecha visible en la UI se muestra en
`dd/mm/yyyy` (con hora `dd/mm/yyyy HH:mm` cuando el dato es `timestamptz`,
en hora local del navegador). Dos helpers en `src/lib/format.ts`,
junto a `formatCurrency`:

- **`formatDate(value)`**: para columnas `date` (sin hora) —
  `scheduled_date`, `hire_date`, `expires_at`, `issued_at`, etc. Parsea el
  string `YYYY-MM-DD` directamente con regex en vez de pasar por `Date`,
  para no arrastrar corrimientos de zona horaria en fechas sin hora.
- **`formatDateTime(value)`**: para columnas `timestamptz` —
  `created_at`, `starts_at`/`ends_at` de historiales de asignación, etc.

Se reemplazaron todos los renders crudos de fecha (`{job.scheduled_date}`,
`Vence ${license.expires_at}`, etc.) y los `formatDateTime` locales
duplicados que había en `DriverAssignmentSection.tsx`,
`VehicleAssignmentHistoryTab.tsx` y `HistoryPanel.tsx` — ahora todos
importan el mismo helper. **Cualquier fecha nueva que se muestre en texto
debe usar `formatDate`/`formatDateTime`, nunca el string crudo de
Supabase.** Los `<input type="date">` nativos (formularios, selector de
fecha del Centro de control, rango personalizado de `DateRangeFilter`) se
quedan como están — el formato de esos lo controla el navegador/SO, no se
puede forzar sin reemplazar el input nativo por un date-picker propio, y
eso no se construyó en esta fase.

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
