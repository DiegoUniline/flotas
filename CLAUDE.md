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

~~Migrar al patrón nuevo: Sucursales → Operadores → Clientes → Rutas.~~
**Completado** — ver "Migración completa al patrón Odoo" más abajo en
este documento. Los cinco módulos reales (Vehículos, Pedidos, Sucursales,
Operadores, Clientes, Rutas) ya están en el patrón nuevo; solo quedan
pendientes los módulos del roadmap que todavía no tienen tabla propia
(`implemented: false` en `navConfig.ts` — Dispositivos, Geocercas,
Refacciones, etc., ver la sección de arriba sobre `navConfig.ts`), que
no se construyen sin antes confirmar esquema/lógica de negocio con el
usuario.

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

### Interactividad real: mapa más grande, click en un punto = ver detalle, filtro por repartidor funcional (agregado en esta fase)

Pedido explícito del usuario: lo anterior corrigió que los pedidos
aparecieran, pero seguía sin la interacción de la referencia (tamaño del
mapa, click en un punto para ver detalle, filtro por repartidor con
efecto real). Todo con datos reales, nada de tracking en vivo:

- **Mapa más grande**: de `480px` a `620px` de alto (mapa protagonista,
  como en la referencia), panel lateral de la unidad de `w-80` a `w-96`.
- **`components/map/Map.tsx`**: `MapMarker` ganó `href?: string` — si se
  define, el popup del marcador (que Leaflet ya abre al hacer click)
  agrega un link real "Ver detalle →". Es un `<a>` normal, no un `Link`
  de React Router, porque el popup es DOM plano fuera del árbol de React;
  funciona por el rewrite de SPA que ya existe en `vercel.json`. Los
  marcadores de pedidos (`job-*`) enlazan a `/pedidos/:id`; los de
  paradas (`stop-*`) a `/pedidos/:id` del pedido de esa parada si tiene
  (`stop.job_id`); los de sucursales no llevan link (todavía no tienen
  ficha propia, siguen en el patrón `Drawer`).
- **Filtro por repartidor con efecto real**: antes solo acortaba las
  opciones del `<select>` de rutas. Ahora el dropdown lista **todos** los
  repartidores activos de la organización (`useRouteDriverOptions`, no
  solo los que ya tienen ruta hoy) y, al elegir uno: filtra los
  marcadores/lista de "Pedidos del día" a solo los suyos
  (`jobs.assigned_driver_id`) y selecciona automáticamente su ruta del
  día si tiene una (mismo mecanismo de auto-selección de abajo).
- **Auto-selección de ruta**: al cargar la página o cambiar de
  fecha/repartidor, si hay rutas disponibles se selecciona la primera
  automáticamente (una sola vez por combinación fecha+repartidor, vía
  `autoSelectKeyRef`) para que el panel de la unidad y el timeline se
  vean de inmediato sin tener que elegir manualmente — igual que en la
  referencia, que siempre muestra una unidad seleccionada. Si el usuario
  después elige "Todas las rutas" a mano, se respeta (no se vuelve a
  auto-seleccionar hasta que cambie la fecha o el repartidor).

### Panel lateral siempre visible + click en un punto del mapa selecciona su detalle (agregado en esta fase)

Pedido explícito del usuario con la imagen de referencia otra vez:
"presiono un pedido en el mapa y veo la info a la derecha y abajo... el
mapa no es lado a lado". Dos problemas reales:

1. El panel derecho solo se pintaba si había una ruta seleccionada por
   dropdown — sin selección desaparecía por completo (no colapsaba a
   "lado a lado" con contenido vacío, simplemente no existía esa
   columna). Ahora **siempre se renderiza** (`lg:w-96`, al lado del
   mapa) con tres estados: panel de ruta, panel de pedido suelto, o un
   placeholder ("Selecciona una ruta o haz click en un pedido del mapa
   para ver su detalle aquí.") — el layout de dos columnas es constante,
   nunca cambia de forma.
2. Los puntos del mapa no eran clickeables más allá del popup de
   Leaflet. **`components/map/Map.tsx`** ganó `onMarkerClick?: (marker)
   => void`, disparado además de abrir el popup normal. `ControlMapPage`
   lo usa así: click en un pedido (`job-*`) → busca si ya tiene una
   parada de ruta real (`fetchRoutePlanIdForJob`, nuevo en
   `routeStopsApi.ts`, consulta `route_stops` por `job_id`) — si la
   tiene, selecciona esa ruta (mismo panel + timeline de siempre, "y
   abajo" también se actualiza); si no tiene ruta, selecciona el pedido
   suelto y el panel derecho muestra su propia ficha resumida (operador/
   vehículo asignado si los tiene, domicilio de entrega, destinatario,
   monto, botón "Ver pedido completo" y "Llamar" si hay teléfono del
   operador) — sin timeline abajo porque un pedido sin ruta no tiene
   paradas reales que mostrar. `fetchDayJobs` se extendió con
   `drivers(first_name, last_name, phone, photo_url)`,
   `vehicles(economic_number, plate)` y `receiver_name` para poder pintar
   ese panel sin una query aparte.
3. El filtro de repartidor ahora también limpia la selección de pedido
   suelto al cambiar (mismo `useEffect` de auto-selección de ruta).

### Panel de unidad: más campos reales de la referencia (agregado en esta fase)

El usuario aceptó que velocidad/batería siguen bloqueados (sin GPS en
vivo) pero pidió el resto de los campos del panel. Todos con datos
reales, ninguno inventado:

- **`vehicles.brand`/`model` ya existían** en el esquema pero no se
  consultaban aquí — se agregaron a `ROUTE_PLAN_SELECT`
  (`routePlansApi.ts`) y a `fetchDayJobs` (`controlApi.ts`) para poder
  mostrar "Vehículo: {brand} {model}" real (helper `vehicleLabel()`).
- **"ID #<economic_number>"**, **"Placas: <plate>"**: ya existían en el
  esquema, solo faltaba mostrarlos como líneas propias bajo el
  encabezado (antes solo se mostraba uno de los dos, pegado al badge de
  estado).
- **Pill de estado junto al nombre** (antes era un badge separado
  debajo): `ROUTE_STATUS_TONE`/`JOB_STATUS_TONE` ya existían para las
  demás pantallas, se reutilizan aquí.
- **"Hora estimada de llegada" + "En tiempo"/"Retrasado"**: dato real,
  no inventado — usa `route_stops.estimated_arrival_at` de la parada
  actual (ya se guardaba, ya se usaba en el timeline de abajo, solo
  faltaba mostrarlo aquí también) comparado contra la hora actual del
  navegador. Si la parada no tiene estimado, muestra "Sin estimar" sin
  inventar una hora.
- **`InfoCell`** (componente local nuevo): celda con ícono + etiqueta +
  valor + subtexto opcional + barra de progreso opcional — reemplaza los
  bloques sueltos de texto por una grilla 2 columnas consistente, en
  ambos paneles (ruta y pedido suelto).
- **Sigue sin construirse (mismo motivo de siempre)**: velocidad actual y
  batería del dispositivo — requieren telemetría en vivo real que hoy no
  existe. Botón "Reasignar" tampoco — no hay una mutación rápida de
  reasignación de ruta construida (reasignar hoy es editar la ficha
  completa en `/rutas/:id`).

### Tracking en vivo por el celular del operador, no por dispositivo GPS dedicado (decisión del usuario, agregado en esta fase)

Pedido explícito del usuario: "hagámoslo por el celular... que lo
tomemos con eso" — resuelve la decisión pendiente documentada desde el
inicio del proyecto sobre `vehicles.last_latitude/longitude/last_position_at`
("Decisiones pendientes... protocolo/proveedor de los GPS"). **Ya no se
va a comprar/integrar un dispositivo GPS dedicado (Traccar/Wialon/etc.)
para esto** — la posición en vivo se captura con la geolocalización del
navegador del celular del propio operador, el mismo mecanismo ya usado en
`GpsCaptureField`/"Usar mi ubicación". Preguntas de mecanismo resueltas
con el usuario (`AskUserQuestion`): comparte el **operador con su propia
cuenta**, guardado **cada ~15s**, el Centro de control se actualiza por
**Supabase Realtime** (primera vez que se usa Realtime en el proyecto).

- **Migración `driver_phone_position_sharing`**: RPC
  `update_my_vehicle_position(p_latitude, p_longitude)` (`SECURITY
  DEFINER`) — resuelve el `driver` del `auth.uid()` que llama, busca el
  vehículo con `assigned_driver_id` = ese operador, y actualiza
  `last_latitude/last_longitude/last_position_at = now()`. Se hizo como
  RPC angosta (no dándole `vehicles.edit` al operador) porque un
  operador solo debe poder escribir la posición de **su propio**
  vehículo asignado, nunca editar cualquier vehículo — mismo criterio
  que `assign_vehicle_to_driver`. También: `alter table vehicles
  replica identity full` + `alter publication supabase_realtime add
  table vehicles`, requisito para que Realtime mande el row completo en
  cada `UPDATE`.
- **`features/tracking/`** (nuevo): `api/trackingApi.ts`
  (`fetchMyDriverProfile` — resuelve si el usuario logueado es un
  operador vía `drivers.user_id = auth.uid()` y su vehículo asignado;
  `updateMyVehiclePosition`), `hooks/useTracking.ts`
  (`useMyDriverProfile`, y `useShareLocation` — envuelve
  `navigator.geolocation.watchPosition` con throttle a 15s en un `ref`,
  porque el navegador puede disparar el callback mucho más seguido),
  `MiUbicacionPage.tsx` (`/mi-ubicacion`, pensada para abrirse en el
  celular del operador: botón "Compartir mi ubicación"/"Dejar de
  compartir", hora de la última posición guardada, mini-mapa con su
  propio punto). **No es tracking en segundo plano ni app nativa** —
  solo funciona mientras esa pestaña sigue abierta y el navegador tiene
  permiso de ubicación otorgado; eso es una limitación real del enfoque
  "por el celular" elegido, no un bug.
- **Header**: nuevo link "Compartir mi ubicación" → `/mi-ubicacion`,
  **solo visible si `useMyDriverProfile()` encuentra un operador
  vinculado** a la cuenta logueada — un admin que no es operador no lo ve.
- **Centro de control**: `fetchLiveVehiclePositions` +
  `useLiveVehiclePositions` (`controlApi.ts`/`useControlMap.ts`) traen
  los vehículos con posición real conocida y se suscriben a un canal
  Realtime de `vehicles` filtrado por organización — cualquier `UPDATE`
  (o sea, cualquier posición nueva) invalida la query y el mapa se
  redibuja solo, sin polling. Se pintan como marcador verde pulsante
  (`live-<id>`) con el nombre del operador y "hace Xs/min/h"
  (`formatAgo`, nuevo helper local). **Se ignoran posiciones de más de
  20 minutos** (`LIVE_POSITION_STALE_MS`) para no dejar un pin fantasma
  de un operador que ya cerró la pestaña — es un corte de frescura real,
  no un dato inventado. Contador "N en vivo" en la leyenda del mapa.
- **Limitación real pendiente, no resuelta en esta fase:** no existe
  ninguna UI todavía para vincular un `drivers.user_id` a una cuenta de
  login — de hecho **no existe ninguna pantalla de invitar/gestionar
  miembros de la organización** en todo el proyecto (`organization_members`
  solo se lee, nunca se escribe desde el frontend). Sin eso, un admin
  tendría que vincular la cuenta a mano (SQL/consola de Supabase) para
  que un operador pueda usar "Compartir mi ubicación" de verdad. Es un
  features aparte y más grande (invitar usuarios, asignarles rol,
  vincularlos a su ficha de operador) — no se inventó aquí porque no fue
  lo que se pidió esta vez; es el siguiente paso lógico si se quiere que
  el tracking por celular funcione de punta a punta sin tocar la base de
  datos a mano.
- **Sigue bloqueado, mismo motivo de siempre:** velocidad y batería del
  dispositivo — la geolocalización del navegador puede traer
  `coords.speed` en algunos dispositivos/navegadores pero no de forma
  confiable (Safari/iOS normalmente no la da), así que no se guarda ni
  se muestra para no mostrar un dato que a veces sí y a veces no es
  real. Si se necesita velocidad real y confiable, evaluar calcularla
  del propio historial de posiciones (distancia/tiempo entre lecturas)
  — no se construyó en esta fase.

### "Ver pedido completo" ya no navega a otra vista — ficha completa en un Modal (agregado en esta fase)

Pedido explícito del usuario: el botón "Ver pedido completo" del panel de
pedido suelto en el Centro de control sacaba de la página (navegaba a
`/pedidos/:id`) — "necesito que no me lleve a otra vista, todo ahí, una
ventana emergente... nada que me haga más pasos".

- **`JobDetailPage.tsx` se partió en dos**: la ficha completa de un
  pedido **ya existente** (secciones, pestaña de Paquetes,
  `HistoryPanel`, guardar/descartar, eliminar) se extrajo a
  **`JobDetailContent.tsx`** — recibe `id` y `onBack()` por props en vez
  de leer `useParams`/usar `useNavigate` directamente, así sirve tanto
  para la ruta `/pedidos/:id` como embebida en cualquier otro lado.
  `JobDetailPage.tsx` quedó solo con el wizard de creación (`id ===
  'nuevo'`) y, para editar, renderiza `<JobDetailContent id={id}
  onBack={() => navigate('/pedidos')} />` — mismo comportamiento de
  siempre en la página completa, cero cambio visible ahí.
- **Centro de control**: nuevo estado `viewJobId`; el botón "Ver pedido
  completo" y cada fila de la tarjeta "Pedidos del día" ya no son
  `<Link to="/pedidos/:id">` — ahora hacen `setViewJobId(job.id)`, que
  abre un `Modal` (el mismo componente ancho del wizard de pedidos) con
  `<JobDetailContent id={viewJobId} onBack={() => setViewJobId(null)}
  backLabel="Cerrar" />` adentro. Se puede editar/guardar/eliminar el
  pedido completo sin salir del Centro de control ni perder la selección
  de ruta/fecha/repartidor que tenías puesta.
- `JobDetailContent` ganó `backLabel`/`hideHeader` opcionales
  precisamente para este tipo de reutilización embebida — cualquier otra
  pantalla que necesite mostrar un pedido completo sin navegar (o con un
  texto de regreso distinto a "Pedidos") puede reusarlo igual.

### Bug real: el mapa de Leaflet se veía encima del Modal (corregido en esta fase)

Reportado por el usuario con captura: al abrir "Ver pedido completo"
desde el Centro de control, el mapa grande de fondo (tiles, pines y los
botones Mapa/Satélite/ubicación de `Map.tsx`) se pintaba **por encima**
del `Modal`, tapando parte de la ficha del pedido. Causa real: el
contenedor de Leaflet (`.leaflet-container`) es `position: relative`
**sin** `z-index` propio, así que no aísla su propio contexto de
apilamiento — todos los `z-index` internos de Leaflet (paneles/popups,
hasta ~700) y los botones propios de `Map.tsx` (`z-[1000]`) compiten
directo contra el resto de la página. `Modal`/`Drawer` usaban `z-40` y
`ConfirmDialog`/`ToastViewport` `z-50` — muy por debajo de 700–1000, por
eso el mapa "ganaba" y se veía encima.

**Corrección:** se subió toda la escala de capas superpuestas de la app
por encima de lo que usa Leaflet/`Map.tsx`, manteniendo el mismo orden
relativo de antes (Toast > ConfirmDialog > Modal/Drawer):
`Modal`/`Drawer` → `z-[1100]`, `ConfirmDialog` → `z-[1200]`,
`ToastViewport` → `z-[1300]`. Los botones internos de `Map.tsx` se
quedan en `z-[1000]` (siguen sin problema, ya quedan por debajo de
cualquier modal/diálogo). Si se agrega otra capa fija/absoluta nueva a
futuro que deba convivir con mapas Leaflet en pantalla, usar esta misma
escala (por encima de 1000) en vez de valores bajos tipo `z-40`/`z-50`.

### Migración completa al patrón Odoo: Sucursales, Operadores, Clientes, Rutas (agregado en esta fase)

Pedido explícito del usuario: "termina todo los módulos que quedan... no
pares hasta terminar". Esto cierra el "Pendiente inmediato" que llevaba
varias fases documentado arriba — los cuatro módulos que seguían en el
patrón viejo (`Drawer` + formulario para alta/edición) ya están en el
mismo patrón que Vehículos/Pedidos: lista 90/10 con `ListToolbar`/
`TableScrollArea`, ficha de detalle con `DetailSection`/`InlineField`/
`RelationSelect`/`SaveDiscardBar`/`HistoryPanel`, fila de tabla completa
clickeable en vez de botones "Editar"/"Eliminar" en la lista. Mismo
criterio en los cuatro: filtros/orden/paginado en el backend, nunca
traer todo y paginar en cliente.

- **Sucursales** (`features/locations`): `LocationsPage.tsx` migrada
  (filtros: tipo, activa, ciudad, estado; agrupar por tipo/activa/
  estado). Nueva `LocationDetailPage.tsx` (`/sucursales/:id`, no existía
  ficha propia antes, solo Drawer) — secciones "Identificación" y
  "Dirección" (con el mismo botón "Usar mi ubicación" que ya tenía el
  formulario viejo). `LocationForm.tsx`/`LocationQuickCreate.tsx` **se
  dejaron intactos** — los sigue usando `RelationSelect` en Vehículos/
  Operadores/Rutas para crear una sucursal en contexto, es un uso
  distinto (formulario corto en Drawer superpuesto) al de la ficha
  principal.
- **Operadores** (`features/drivers`): `DriversPage.tsx` migrada
  (filtros: estado, activo, no. empleado). `DriverDetailPage.tsx`
  reconstruida con secciones "Identificación"/"Contacto"/"Empleo"
  (sucursal base vía `RelationSelect`)/"Notas", más `Tabs` con
  "Vehículo asignado"/"Licencias"/"Certificaciones" — **se reutilizaron
  tal cual** `DriverAssignmentSection`/`DriverLicensesSection`/
  `DriverCertificationsSection` (ya eran tarjetas autocontenidas con su
  propio CRUD en Drawer para sub-recursos cortos, no hacía falta
  reescribirlas, solo se movieron de "siempre visibles apiladas" a
  pestañas). `useDriverDetail.ts`: `fetchDriverById` ahora trae
  `locations!drivers_primary_location_id_fkey(name)` para poder mostrar
  el label de la sucursal base en el `RelationSelect` sin una query
  aparte.
- **Clientes** (`features/customers`): `CustomersPage.tsx` migrada
  (filtro: estado, RFC). `CustomerDetailPage.tsx` reconstruida con
  secciones "Identificación"/"Contacto"/"Notas" + `CustomerLocationsSection`
  (domicilios, sin cambios, ya era una tarjeta autocontenida). Se movió
  `fetchCustomerById` de `useCustomerDetail.ts` a `customersApi.ts` (mismo
  lugar que el resto de los módulos migrados — `fetchXById` vive en el
  `api/`, no en el hook de sub-recursos).
- **Rutas** (`features/routes`): `RoutesPage.tsx` migrada — aquí **no**
  se usó `ListToolbar`/`DateRangeFilter` como en los otros tres, a
  propósito: una ruta es inherentemente de **un solo día** (planeación
  operativa diaria), no un reporte histórico por rango de fechas, así
  que se mantuvo el selector de fecha único en pastilla (como ya tenía)
  en vez de forzar el componente de rango genérico. Sí se agregó
  buscador real en base (`route_number`/`name`) vía un `search` opcional
  nuevo en `RoutePlanFilters`/`fetchRoutePlans` (opcional para no romper
  `ControlMapPage.tsx`, que sigue llamando `useRoutePlansQuery` sin
  `search`). Nueva `RouteDetailPage.tsx` unificada (antes "crear" y
  "editar" eran flujos distintos: Drawer con `RoutePlanForm.tsx` para
  crear, la ficha vieja no editaba nada) — sección "Datos de la ruta"
  con operador/vehículo/sucursal vía `RelationSelect` (con creación en
  contexto), Paradas se dejó igual (agregar desde pedido sigue en
  Drawer, es una lista corta de selección, no un formulario largo).
  Se agregó **"Cancelar ruta"** (botón real, antes no existía en la UI
  aunque el estado `cancelled` y el criterio "no se borran, se cancelan"
  ya estaban documentados) — visible mientras la ruta no esté
  `completed`/`cancelled`. `RoutePlanForm.tsx` (Drawer viejo de creación)
  se eliminó del repo, ya no tenía ningún uso.
- **Patrón para cuando se necesite de nuevo:** `fetchXById` va en
  `api/xApi.ts`; el detalle es un solo componente que sirve para crear
  (`id === 'nuevo'`) y editar (mismo `draft`/`original`/`dirty`/
  `SaveDiscardBar`); sub-recursos ya construidos como tarjetas
  autocontenidas (con su propio Drawer corto) se reutilizan tal cual
  dentro de `Tabs`, no hace falta reescribirlos — la migración es del
  *contenedor* (lista + ficha principal), no de cada sub-recurso.

### Módulo Flota completo: Dispositivos + Geocercas (agregado en esta fase)

Pedido explícito del usuario: "termina todo le modulo de flota completo
todo" — la sección "Flota" del sidebar (`navConfig.ts`) solo tenía
Vehículos y Operadores construidos; Dispositivos y Geocercas eran los
últimos dos ítems `implemented: false` de esa sección. Se construyeron
ambos completos (tabla + RLS + CRUD con el patrón Odoo, mismo criterio
que el resto del módulo Flota), bajo permiso explícito ya otorgado por
el usuario para ejecutar en Supabase sin preguntar.

- **`devices`** (tabla nueva, migración `devices_and_geofences`, mismo
  patrón RLS/triggers que el resto): inventario genérico de hardware
  asignado a la flota — `device_type` texto libre (`DEVICE_TYPES`:
  rastreador GPS/dashcam/sensor de combustible/tablet/otro, mismo
  criterio que `vehicles.status`), `serial_number`, `status` (activo/
  inactivo/en mantenimiento/perdido-robado), `vehicle_id` opcional (FK a
  `vehicles`, un dispositivo puede no estar instalado en ningún
  vehículo), `install_date`, `notes`. Write gateado por el permiso ya
  sembrado `devices.manage` (no existe `devices.view` separado — mismo
  criterio que otros módulos donde el permiso de escritura ya cubre
  lectura vía RLS de `select`). **Decisión de alcance importante:** esta
  tabla es inventario/activo fijo, **no** está conectada a ningún
  mecanismo de posición en vivo — el tracking en vivo real de la flota
  sigue siendo exclusivamente `vehicles.last_latitude/longitude/
  last_position_at`, poblado solo por la RPC `update_my_vehicle_position`
  (celular del operador, decisión de una fase anterior). Un
  `device_type = 'gps_tracker'` en este catálogo es un registro de que
  *existe* un rastreador físico instalado (útil para saber qué unidad
  trae qué hardware, mantenimiento, garantías, etc.), no un origen de
  datos de posición — si en el futuro se conecta un proveedor de
  hardware real (Traccar/Wialon/webhook), ese proveedor seguiría
  escribiendo en `vehicles.last_*`, no en `devices`.
- **`geofences`** (tabla nueva, misma migración): zonas **circulares**
  únicamente (`center_latitude`, `center_longitude`, `radius_meters`) —
  se eligió círculo en vez de polígono a propósito, para no depender de
  una librería de dibujo (Leaflet.draw u otra) que no es dependencia hoy;
  si se necesita geometría arbitraria más adelante, evaluar entonces.
  `color` (paleta fija `GEOFENCE_COLORS`, 5 opciones) para diferenciarlas
  visualmente, `location_id` opcional (FK a `locations`, para relacionar
  una geocerca con la sucursal que representa, ej. el radio de entrega
  de una sucursal). Write gateado por `geofences.manage` (ya sembrado).
  **Deliberadamente sin ninguna lógica de entrada/salida (enter/exit) ni
  alertas** — eso requeriría correlacionar la geometría contra posición
  en vivo de un vehículo, y (a) el motor de alertas genérico no existe
  (Fase 6 del roadmap) y (b) la posición en vivo solo existe de forma
  transitoria mientras un operador tiene la pestaña de "Compartir mi
  ubicación" abierta — no hay una posición continua y confiable contra
  la cual evaluar cruces de geocerca todavía. Estas tablas son hoy
  puramente definición de zonas, sin comportamiento reactivo.
- **`GeofenceMapField.tsx`** (`features/geofences/components/`): mismo
  patrón que `GpsCaptureField` (mapa Leaflet + buscador de dirección con
  Nominatim + click/arrastre para reposicionar) pero dibuja un
  `L.circle` en vez de un pin suelto, con el radio/color sincronizados
  en vivo desde el draft del formulario. Se extrajo `searchAddress` a
  **`src/lib/geocode.ts`** (antes vivía solo dentro de
  `GpsCaptureField.tsx`) para que ambos componentes lo compartan sin
  duplicar el fetch a Nominatim — cualquier campo de mapa nuevo que
  necesite buscador de dirección debe importar de ahí, no reimplementarlo.
- Ambos módulos siguen el patrón Odoo estándar completo: `api/`
  (filtros/orden/paginado server-side, `fetchXById`, CRUD, soft delete
  vía `deleted_at`), `hooks/` (TanStack Query + toasts en español),
  tabla 90/10 con fila completa clickeable, ficha con
  `DetailSection`/`InlineField`/`RelationSelect`/`SaveDiscardBar`/
  `HistoryPanel` (`entityType: 'devices'`/`'geofences'`, cubierto por
  `audit_trigger()` como cualquier tabla). Validación de obligatorios:
  Dispositivos exige **Nombre**; Geocercas exige **Nombre** y **centro
  definido** (sin las coordenadas no hay zona real que guardar).
- `navConfig.ts`: "Dispositivos" y "Geocercas" pasaron a
  `implemented: true` — la sección "Flota" del sidebar queda completa
  (Vehículos, Operadores, Dispositivos, Geocercas, los 4 ítems reales).
- **No construido a propósito, mismo criterio de "no inventar sin
  confirmar" de siempre:** UI de mapa que muestre todas las geocercas
  superpuestas en el Centro de control (hoy cada geocerca solo se ve en
  su propia ficha) y cualquier regla de negocio que use estas tablas
  (ej. "no permitir entrega fuera de la geocerca del cliente",
  "notificar si el vehículo sale de zona") — ambas son features
  aparte que dependen de decisiones de producto no pedidas todavía.

### Módulo Costos completo: Combustible, Gastos, Costos (agregado en esta fase)

Pedido explícito del usuario: "ahora todo el modulo de costos" — los 3
ítems de la sección "Costos" del sidebar (`navConfig.ts`) estaban
`implemented: false`. Antes de construir se revisaron los permisos ya
sembrados en `permissions`/`role_permissions` (regla del proyecto: no
inventar sin confirmar qué ya existe) y resultó que el esquema de
permisos **ya modela un flujo de aprobación real**: `expenses.create`
(lo tiene hasta el rol Operador, no solo administración),
`expenses.approve` (Administrador/Finanzas/Gerente de flota/Propietario)
y `expenses.view` (más roles de solo consulta) son permisos distintos —
no fue una decisión de producto inventada aquí, ya estaba en la base.

- **`fuel_logs`** (migración `fuel_logs_and_expenses`): cargas de
  combustible — `vehicle_id` obligatorio, `driver_id` opcional,
  `logged_at timestamptz`, `liters`/`total_cost numeric` (se capturan
  los dos directos, el costo por litro se **calcula en UI**
  `total_cost/liters`, no se persiste, mismo criterio que el % de
  seguro de Pedidos — nunca guardar un derivado que se puede
  desincronizar), `odometer` opcional, `station`, `fuel_type` (texto
  libre), `full_tank`. Write gateado por el único permiso sembrado
  `fuel.manage` (cubre create/edit/delete, igual que Dispositivos/
  Geocercas).
- **`expenses`**: gastos operativos — `category` texto libre
  (`EXPENSE_CATEGORIES`: mantenimiento/casetas/estacionamiento/multas/
  seguros/permisos/otro), `amount`, `expense_date`, `vehicle_id`/
  `driver_id` opcionales, `status` (`pending`/`approved`/`rejected`,
  default `pending`), `approved_by`/`approved_at`. RLS respeta la
  separación de permisos ya sembrada: insert requiere
  `expenses.create`, delete requiere `expenses.approve` (solo quien
  aprueba puede borrar), update permite `expenses.create` **o**
  `expenses.approve` (para que quien capturó pueda seguir editando su
  borrador). **Select se amplió a `expenses.view` OR `expenses.create`**
  — sin esto, un Operador (que solo tiene `expenses.create`) rompería el
  patrón `.insert(...).select().single()` que usa toda la capa `api/`
  del proyecto, porque RLS bloquearía la lectura de vuelta del registro
  recién creado. Es una decisión de RLS tomada aquí, documentada porque
  amplía la lectura más allá de lo que el permiso `expenses.view`
  sugiere por nombre.
- **`set_expense_status(p_expense_id, p_status)`** (RPC `SECURITY
  DEFINER`): aprobar/rechazar/regresar a pendiente. No es un `update`
  directo desde el frontend — mismo criterio que
  `assign_vehicle_to_driver`/`update_my_vehicle_position`: una acción
  con efecto de negocio (sella `approved_by = auth.uid()` y
  `approved_at = now()`) se resuelve con una RPC angosta que valida
  `has_permission(org, 'expenses.approve')` server-side, nunca confiando
  en que el frontend mande el `approved_by` correcto. Botones
  "Aprobar"/"Rechazar" en la ficha de gasto, gateados con
  `<Can permission="expenses.approve">`, visibles solo si el gasto está
  `pending`.
- **`features/fuel`** y **`features/expenses`**: mismo patrón Odoo
  estándar completo (api con filtros/orden/paginado server-side +
  `fetchXById`/CRUD + soft delete, hooks TanStack Query con toasts,
  tabla 90/10, ficha con `DetailSection`/`RelationSelect`/
  `SaveDiscardBar`/`HistoryPanel`). Validación de obligatorios:
  Combustible exige **Vehículo**, **Litros** y **Costo total**; Gastos
  exige **Monto** y **Fecha**.
- **`features/costs/CostsPage.tsx`** (`/costos`, sin ficha — es un
  reporte, no un CRUD): selector de rango de fechas (`DateRangeFilter`
  solo, sin el `ListToolbar` completo porque no hay tabla paginada que
  filtrar/ordenar, es un agregado) + 4 KPIs (costo total, combustible,
  gastos aprobados, gastos pendientes) + tabla "Costos por vehículo"
  (combustible + gastos aprobados sumados por `vehicle_id`) + tabla
  "Gastos por categoría". **Solo cuentan los gastos con `status =
  'approved'`** en los totales — un gasto `pending`/`rejected` no es un
  costo confirmado todavía (los pendientes sí se muestran aparte, como
  dato informativo de cuánto falta por revisar). `features/costs/api/costsApi.ts`
  trae las filas de `fuel_logs`/`expenses` del periodo (con un tope
  `ROW_LIMIT = 3000` de seguridad) y agrega en el cliente — mismo
  criterio ya aceptado y documentado para "Agrupar por" en el patrón
  Odoo (correcto para el volumen de una PyME en un rango acotado; si
  crece, mover a una vista o RPC con `sum()`/`group by` real en Postgres).
- **No construido a propósito:** eficiencia de combustible (km/l a
  partir de diferencias de odómetro entre cargas del mismo vehículo) —
  requiere manejar resets de odómetro, cambios de vehículo, y cargas
  fuera de orden; no se pidió y se prestaría a un cálculo silenciosamente
  incorrecto si se apresura. Motor de tarifas o presupuestos por
  categoría/vehículo (comparar gasto real contra un límite) — depende de
  que el usuario defina esos límites, no se inventó. Un flujo de
  captura de gasto simplificado para operadores (que hoy tienen
  `expenses.create` pero no aparecen en el sidebar porque el ítem
  "Gastos" usa el permiso `expenses.view` para mostrarse) — pueden crear
  gastos si llegan a `/gastos/nuevo` por URL directa, pero no tienen la
  entrada de menú; construir esa pantalla dedicada si se pide.
- `navConfig.ts`: "Combustible"/"Gastos"/"Costos" pasaron a
  `implemented: true` — sección "Costos" del sidebar completa.

### Combustible completo: catálogos de gasolinera/tipo, factura, fotos (agregado en esta fase)

Pedido explícito del usuario tras probar el módulo con un registro real
("Gasolinera Lupita", diésel, 150 L): faltaba foto del ticket, si lleva/ya
se facturó, foto del odómetro, y **gasolinera/tipo de combustible debían
ser catálogo, no texto libre** (para evitar duplicados tipo "Diesel" vs
"Diésel" y poder agrupar/reportar por gasolinera real). Migración
`fuel_stations_and_types_catalog`:

- **`fuel_stations`**: catálogo **por organización únicamente** (sin
  default del sistema — a diferencia de `vehicle_types`, no existe una
  lista universal razonable de gasolineras, cada empresa arma la suya
  sobre la marcha). Write gateado por `fuel.manage`. Índice único
  `(organization_id, name)` para no duplicar el nombre dentro de la
  misma organización.
- **`fuel_types`**: mismo patrón que `vehicle_types` —
  `organization_id null` = default del sistema (sembrados: Gasolina
  Regular (87), Gasolina Premium (91), Diésel, Gas LP, Eléctrico),
  `organization_id` propio = tipo personalizado. Mismo permiso
  `fuel.manage` para altas propias de la org.
- **`fuel_logs.station`/`fuel_type` (texto libre) se eliminaron** y se
  reemplazaron por `fuel_station_id`/`fuel_type_id` (FK, ambas
  nullable). **Migración de datos reales, no solo de esquema:** ya
  existía 1 registro real capturado por el usuario antes de este
  cambio — el backfill de la misma migración creó las filas de catálogo
  correspondientes (`fuel_stations`/`fuel_types` por organización) a
  partir del texto que ya tenía guardado y reapuntó ese registro a los
  nuevos IDs antes de tirar las columnas viejas; se verificó por SQL que
  el dato sobrevivió intacto. **Nunca botar una columna con datos reales
  sin backfillear primero** — mismo criterio que
  `add_active_organization_to_profiles` y la migración de
  `vehicle_type` texto libre a `vehicle_type_id` de Fase 2a.
- **`has_invoice` (boolean) + `invoiced` (boolean)**: "si lleva factura"
  y "si ya se facturó" son preguntas distintas (una gasolinera puede no
  dar factura fiscal; y si la da, el CFDI casi nunca llega en el momento
  de la carga, se procesa después) — dos campos separados, no uno. El
  campo "Ya facturado" **solo se muestra en la UI si "Lleva factura" está
  activo** (mismo criterio que el GPS de recolección condicional en
  Pedidos); al guardar, `invoiced` se fuerza a `false` si `has_invoice`
  es `false`, para que nunca quede un estado contradictorio en la base.
- **Fotos de ticket y odómetro**: se reutilizó tal cual el sistema
  genérico de `attachments`/`AttachmentUploader` ya existente (mismo
  patrón que licencias/certificaciones/documentos de vehículo) —
  `entity_type: 'fuel_log_receipt'` y `entity_type: 'fuel_log_odometer'`,
  `entity_id` = id de la carga. **No se agregaron columnas de foto** a
  `fuel_logs` a propósito, siguiendo la regla ya documentada de no
  duplicar el patrón de attachments. Igual que en el resto del proyecto,
  el uploader solo aparece al editar (necesita el `id` ya guardado).
- **`RelationSelect` con creación en contexto** para ambos catálogos
  (`FuelStationQuickForm.tsx`/`FuelTypeQuickForm.tsx`, mismo patrón que
  `VehicleTypeQuickForm.tsx`) — capturar una carga nueva no bloquea al
  usuario si la gasolinera o el tipo de combustible no existen todavía
  en el catálogo, los crea al vuelo sin perder el borrador.
- Tabla de Combustible ganó columnas "Gasolinera" y "Factura" (badge:
  Sin factura/Por facturar/Facturado); filtros de lista cambiaron de
  texto libre (`fuel_type`/`station`) a booleanos (`has_invoice`/
  `invoiced`/`full_tank`) y se agregó agrupar por gasolinera/tipo de
  combustible. El buscador de la lista ahora busca en **notas** en vez
  de en `station` (ya no es texto libre en esa tabla).
- **No construido a propósito:** número/folio de factura o UUID de CFDI
  como campo propio — el usuario pidió el booleano de si ya se facturó,
  no un módulo de conciliación fiscal; si se necesita capturar el folio
  real, agregar un campo `invoice_number` cuando se pida. Tampoco se
  tocó `vehicles.fuel_type` (sigue como texto libre en la ficha de
  Vehículos) — el catálogo `fuel_types` nuevo es específico del flujo de
  captura de cargas de combustible, no se pidió unificarlo con el campo
  de Vehículos ni migrar datos de vehículos existentes; evaluarlo si se
  pide más adelante.

### Bug real: `HistoryPanel` nunca mostraba nada, en ninguna ficha (corregido en esta fase)

Reportado por el usuario: "Historial de cambios no estan guardando nada
ya cree y no dice creado tal dia por tal persona". Causa real, verificada
por SQL directo contra `audit_logs`: los eventos **sí se estaban
registrando** (el trigger `audit_trigger()` nunca falló), el problema era
puramente de lectura. `features/audit/api/auditLogApi.ts` pedía
`profiles(first_name, last_name)` como embed de PostgREST sobre
`audit_logs`, pero la única FK de `audit_logs.user_id` apuntaba a
`auth.users(id)`, **no** a `public.profiles(id)` — sin una FK directa
entre `audit_logs` y `profiles`, PostgREST no puede resolver ese embed y
la query entera responde error. `HistoryPanel.tsx` nunca manejaba
`historyQuery.isError` (solo `isLoading`/`data`), así que un error de
PostgREST se veía como panel vacío y silencioso — nunca mostró "Creado"
en ninguna ficha desde que se construyó (Vehículos, Pedidos, y todo lo
que se le agregó después), no fue una regresión de esta fase.

**Corrección de esquema** (migración
`fix_audit_logs_user_fk_to_profiles`): se cambió la FK de
`audit_logs.user_id` para apuntar a `public.profiles(id)` en vez de
`auth.users(id)` — es el mismo espacio de valores (`profiles.id` ya
referencia `auth.users(id)` 1:1, todo usuario con sesión tiene su fila
en `profiles` vía `handle_new_user()`), así que el cambio no pierde
integridad referencial y desbloquea el embed. Se verificó por SQL que,
tras el cambio, el join real resuelve el nombre del usuario que creó el
primer registro de prueba de Combustible. **Regla para cualquier FK
nueva a un usuario/autor:** si en algún punto se necesita mostrar
nombre/datos del usuario vía PostgREST embed, la FK debe apuntar a
`public.profiles`, no a `auth.users` (esquema `auth` no es embebible
desde el cliente de todas formas).
- **`HistoryPanel.tsx`** también ganó manejo de `historyQuery.isError`
  (`ErrorState` con reintentar) — antes un error de este tipo no tenía
  ninguna señal visible; ahora se ve un mensaje real en vez de un panel
  vacío, consistente con el resto de la app (mismo patrón de
  `ErrorState`/`onRetry` que toda tabla y ficha ya usa).

### Módulo Mantenimiento: servicios por km/tiempo, vencimientos, Refacciones (agregado en esta fase)

Pedido explícito del usuario: "tiene que haber la parte de que servicios
se le hacen cada X kilómetros, cuáles por tiempo, si ya se hicieron o no,
o sea toda la gestión completa". Migración `maintenance_and_parts`:

- **`maintenance_types`** (catálogo, mismo patrón que `vehicle_types`:
  `organization_id null` = default del sistema — se sembraron 6 típicos
  con intervalo real: Cambio de aceite y filtro (5,000 km / 180 días),
  Rotación de llantas (10,000 km), Cambio de filtro de aire (15,000 km),
  Servicio de frenos (20,000 km), Afinación mayor (40,000 km / 365 días),
  Revisión general (180 días) — `organization_id` propio = tipo
  personalizado). Cada tipo define `interval_km` y/o `interval_days`
  (ambos opcionales pero se exige al menos uno al guardar) — así se
  cubre explícitamente "cuáles por km, cuáles por tiempo": algunos
  servicios solo aplican por kilometraje, otros solo por fecha, otros
  ambos. Gestión completa en `/mantenimientos/tipos` (no está en
  `navConfig.ts`, se llega por un link "Tipos de servicio" dentro de
  Mantenimientos — mismo criterio que `vehicle_types` de no ocupar un
  ítem de sidebar para un catálogo secundario) + creación rápida con
  intervalo incluido desde `RelationSelect` (`MaintenanceTypeQuickForm.tsx`
  — a diferencia de `VehicleTypeQuickForm` que solo pide nombre, aquí el
  intervalo es el dato central, así que el quick-create también lo pide).
- **`maintenance_records`**: el servicio en sí — `vehicle_id` +
  `maintenance_type_id` obligatorios, `status` (programado/completado/
  cancelado), `scheduled_date`/`scheduled_odometer` (cuándo se programó),
  `completed_date`/`completed_odometer` (cuándo y a qué kilometraje se
  hizo de verdad — **esto es el "si ya se hicieron o no"**: un registro
  con `status = 'completed'` es un servicio realmente hecho, uno en
  `scheduled` es solo un plan), `cost`, `provider` (taller/proveedor),
  `notes`. Al cambiar el estado a "Completado" en la ficha, si no había
  fecha de cierre se sella con hoy automáticamente (no obliga a
  capturarla a mano, pero se puede corregir).
- **Pestaña "Próximos vencimientos"** (`MaintenanceRecordsPage.tsx`,
  segunda pestaña junto a "Historial", sin tabla nueva — se deriva en
  vivo): `features/maintenance/api/maintenanceDueApi.ts` calcula, por
  cada combinación vehículo × tipo de servicio con intervalo definido,
  el último `maintenance_records` con `status = 'completed'` de ese
  tipo para ese vehículo, y a partir de su fecha/km + el intervalo del
  tipo obtiene el próximo vencimiento (por km usando
  `vehicles.current_odometer` real, por fecha usando hoy). Estados:
  **Vencido** (ya pasó el km o la fecha), **Próximo a vencer** (dentro
  de 500 km o 15 días del límite — margen de aviso, no dato inventado),
  **Al día**, **Sin historial** (nunca se ha registrado ese servicio
  para ese vehículo — no se marca como "vencido" porque no hay manera
  de saber si aplica desde cuándo). Botón "Programar" por fila que abre
  `/mantenimientos/nuevo?vehicle_id=..&maintenance_type_id=..` — la
  ficha de creación lee esos query params y precarga vehículo/tipo
  (primer uso de prefill por query string en el proyecto; documentado
  por si se replica en otro flujo similar). **No hay tabla de
  "programación" separada** — el vencimiento siempre se deriva de los
  `maintenance_records` reales, igual criterio que "no duplicar estado
  que ya se puede calcular" usado en otras partes del proyecto.
- **`parts` (Refacciones)**: catálogo de inventario — `sku`, `name`,
  `category`, `unit` (pieza/litro/kg/juego), `unit_cost`,
  `quantity_on_hand`, `min_stock` (badge "Stock bajo" en la tabla
  cuando existencia ≤ mínimo), `supplier`. Mismo permiso
  `maintenance.manage` que Mantenimientos (ya estaba así en
  `navConfig.ts` desde el roadmap — señal de que ambos módulos se
  diseñaron como el mismo dominio). **La existencia se ajusta a mano**
  (editar `quantity_on_hand` directo en la ficha) — deliberadamente
  **no** se construyó un descuento automático de inventario al usar una
  refacción en un servicio ni una tabla de movimientos/kardex; eso es
  un sistema de inventario aparte (entradas, salidas, ajustes con
  motivo) que no se pidió y se prestaría a inventar reglas de negocio
  no confirmadas.
- **`maintenance_record_parts`**: pestaña "Refacciones" dentro de la
  ficha de un servicio (`MaintenanceRecordPartsTab.tsx`, mismo patrón de
  filas editables con commit en `onBlur` que `JobPackagesTab.tsx`) —
  qué refacciones y cuántas se usaron en ese servicio, con costo
  unitario capturado (puede diferir del costo de catálogo si cambió el
  precio) y total calculado en UI. Solo informativo/de registro, no
  mueve `parts.quantity_on_hand` automáticamente (mismo criterio de
  arriba).
- RLS de las 4 tablas nuevas: select por membresía de organización
  (igual que `jobs`/`route_plans` — el permiso `.view` no se aplica a
  nivel RLS, solo gatea qué se pinta en el sidebar vía `can()`, es el
  patrón real de todo el proyecto verificado contra `jobs_select`);
  insert/update/delete gateados por `maintenance.manage`. Se verificó
  que todo rol con `maintenance.manage` también tiene `maintenance.view`
  (no hizo falta el truco de ampliar el select con OR que sí fue
  necesario en `expenses`, donde sí había un rol con permiso de crear
  pero no de ver).
- `navConfig.ts`: "Mantenimientos" y "Refacciones" pasaron a
  `implemented: true`.
- **Deliberadamente no construido en esta fase — "Inspecciones"** (el
  tercer ítem de la sección "Mantenimiento" del sidebar, permiso
  `inspections.perform`): el pedido del usuario fue específicamente
  sobre servicios por km/tiempo y si ya se hicieron, no mencionó nada de
  checklists de inspección. Es una feature distinta (motor de
  plantillas de inspección con ítems tipo bien/mal por checklist,
  típico DVIR) con su propio permiso separado, no comparte tablas con
  Mantenimiento — construirla especulativamente sin ninguna señal de
  cómo debe verse el checklist se prestaría a inventar una UI que no
  sirva. Queda pendiente para cuando se pida explícitamente, con el
  mismo criterio de "confirmar antes de construir" del resto del
  proyecto.

### Inspecciones: checklist con plantillas propias (agregado en esta fase, cierra el módulo Mantenimiento)

Pedido explícito del usuario: "termina todo el modulo completo" — tras la
fase anterior de Mantenimiento (que dejó Inspecciones deliberadamente
fuera por ser una feature distinta, ver arriba), el usuario pidió
terminar los 3 ítems de la sección. Migración `inspections`:

- **`inspection_templates`** + **`inspection_template_items`**: cada
  organización define sus propias plantillas de checklist (sin default
  del sistema — a diferencia de `maintenance_types`, no hay un checklist
  universal razonable, cada empresa tiene sus propios puntos a revisar).
  Gestión en `/inspecciones/plantillas` (mismo criterio de
  `mantenimientos/tipos`: catálogo secundario, no ocupa ítem de sidebar,
  se llega por un link "Plantillas" dentro de Inspecciones). Los ítems
  del checklist se editan con `InspectionTemplateItemsEditor.tsx` —
  filas simples (etiqueta + mover arriba/abajo con `sort_order` +
  eliminar) + un campo para agregar uno nuevo; **solo disponible una vez
  guardada la plantilla** (necesita su `id`), mismo patrón que
  licencias/documentos que dependen de un registro padre ya existente.
- **`inspections`**: el registro de una inspección real — `vehicle_id` +
  `template_id` obligatorios, `driver_id` opcional (quién la realizó),
  `performed_at timestamptz`, `odometer`, `overall_result` (`pass`/
  `fail`), `notes`.
- **`inspection_item_results`**: el resultado de cada punto del
  checklist para esa inspección (`ok`/`issue`/`na` + notas opcionales,
  solo se piden si el punto quedó en `issue`). **`overall_result` se
  calcula solo, no se captura a mano**: si algún punto del checklist
  queda en `issue`, la inspección completa se marca `fail`; si no, `pass`
  — se calcula en el frontend al guardar (`InspectionDetailPage.tsx`,
  `handleSave`) y se manda ya resuelto, mismo criterio de "no pedir un
  dato que se puede derivar" usado en otras partes del proyecto.
- **Flujo de captura** (`InspectionChecklist.tsx`): al elegir la
  plantilla en la ficha, se cargan sus ítems (`fetchInspectionTemplateItems`)
  y se arma un checklist local con estado `ok` por defecto en cada punto;
  el usuario cambia a `Problema`/`N/A` por punto (botones tipo píldora,
  igual criterio que el resto de la app para pocas opciones) y agrega
  una nota solo si marcó `Problema`. Al guardar, se crea/actualiza la
  inspección y luego se guardan todos los resultados del checklist de
  una sola vez (`saveInspectionItemResults` en
  `inspectionItemResultsApi.ts` — trae lo que ya existe, actualiza por
  `template_item_id` e inserta lo que falta; no hay upsert nativo cómodo
  desde supabase-js para esto, se resuelve explícito con dos pasos).
  **Limitación real y deliberada:** si se edita una inspección ya
  guardada y la plantilla ganó/perdió puntos después, el checklist que
  se ve sigue siendo el que existía al momento de guardar esa inspección
  (no se re-sincroniza contra la plantilla actual) — es intencional,
  una inspección es un registro histórico de lo que se revisó ese día,
  no debe moverse retroactivamente si la plantilla cambia después
  (mismo criterio ya usado con el snapshot de paradas de ruta en Fase 4).
- RLS de las 4 tablas: select por membresía de organización, write
  gateado por el único permiso sembrado `inspections.perform` (cubre
  crear/editar/eliminar tanto plantillas como inspecciones — mismo
  criterio de permiso único que Dispositivos/Geocercas).
- `navConfig.ts`: "Inspecciones" pasó a `implemented: true` — con esto
  la sección "Mantenimiento" del sidebar queda completa (Mantenimientos,
  Inspecciones, Refacciones, los 3 ítems reales).
- **No construido a propósito:** motor de alertas/notificación cuando
  una inspección sale `fail` (correo, aviso en Centro de control, etc.)
  — depende del motor de alertas genérico (Fase 6 del roadmap, sigue sin
  construirse); fotos por punto del checklist (a diferencia de
  Combustible, donde sí se pidieron fotos de ticket/odómetro, aquí no se
  pidió evidencia fotográfica — agregar con el mismo patrón de
  `AttachmentUploader` si se pide después).

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

## Módulo Configuración: Usuarios, Roles, Empresa (agregado en esta fase)

Pedido explícito del usuario tras terminar Flota/Mantenimiento/Costos:
"termina mi proyecto de Flotas". De los ~13 ítems `implemented: false` que
quedaban en `navConfig.ts`, se construyeron los tres que no requerían
inventar lógica de negocio nueva (esquema y permisos ya existían desde el
arranque del proyecto): **Usuarios**, **Roles**, **Empresa**. Se dejaron
deliberadamente sin construir (ver bullet al final de esta sección):
Inicio, Incidentes, Alertas, Documentos, Reportes, Indicadores, Campos
personalizados, Vistas, Integraciones, API, Suscripción.

### Invitaciones sin envío de correo automático (migración `organization_invites_and_owner_guard`)

No hay integración de envío de correo en el proyecto y las invitaciones no
pueden usar `supabase.auth.admin.inviteUserByEmail()` (requiere
`service_role`, nunca expuesto al navegador, y este proyecto nunca ha usado
Edge Functions). Se resolvió con una tabla de tokens + dos RPCs
`SECURITY DEFINER` angostas, mismo patrón que
`assign_vehicle_to_driver`/`update_my_vehicle_position`:

- **`organization_invites`**: `email`, `role_id`, `location_id` opcional,
  `token` (aleatorio, único), `status` (pending/accepted/revoked/expired),
  `expires_at` (7 días). RLS: select/insert/update/delete gateados por
  `has_permission(org, 'users.manage')`. Índice único parcial
  `(organization_id, lower(email)) where status = 'pending'` — no se puede
  invitar dos veces al mismo correo mientras la invitación previa siga
  pendiente.
- **`get_invite_by_token(p_token)`**: lookup público (sin depender de RLS,
  el visitante no está autenticado todavía) — nombre de organización, rol,
  correo, estado, vencimiento.
- **`accept_organization_invite(p_token)`**: valida token/estado/vencimiento
  y que `auth.jwt()->>'email'` coincida con el correo invitado, luego
  inserta/actualiza `organization_members` (`on conflict` por si la persona
  ya era miembro con otro rol) y marca la invitación `accepted`.
- **Como no se envía correo real**, `InviteMemberDrawer.tsx` muestra el
  enlace (`/invitacion/<token>`) para copiar y compartir a mano (WhatsApp,
  correo, etc.) — explícito en la UI, no se simula un envío que no existe.
- **Guard de último Propietario**: trigger `prevent_last_owner_removal()`
  (`BEFORE UPDATE OR DELETE` en `organization_members`) bloquea, a nivel de
  base de datos, quitar el rol de Propietario o eliminar al único miembro
  activo con rol `owner` de una organización — protección real, no solo de
  UI, para no dejar una empresa sin nadie que pueda administrarla.
- **`profiles.email`** (migración `profiles_email`): no existía columna de
  correo en `profiles` y `auth.users` no es consultable desde el cliente —
  necesaria para que la lista de Usuarios muestre el correo de cada
  miembro. Backfill desde `auth.users` + `handle_new_user()` actualizado
  para poblarla en cada alta nueva.
- **Redirección post-confirmación de correo**: Supabase regresa al usuario
  a la raíz del sitio tras confirmar su correo, no a `/invitacion/:token`.
  `InviteAcceptPage.tsx` guarda el token en `sessionStorage`
  (`flotaa:pending-invite-token`) al montar; `ProtectedRoute.tsx` revisa
  esa llave en cada render y redirige a `/invitacion/:token` si existe —
  mismo mecanismo de `sessionStorage` ya usado para el borrador del wizard
  de Pedidos, no una persistencia nueva. Se limpia al aceptar la
  invitación o si el usuario cierra sesión desde ahí.

### Roles: sistema (solo lectura) vs. personalizados por organización

`RoleDetailPage.tsx` distingue `role.organization_id == null` (rol de
sistema, sembrado para todas las orgs: admin/viewer/dispatcher/finance/
fleet_manager/mechanic/driver/owner/supervisor) de un rol propio de la
organización. **Los roles de sistema son de solo lectura incluso a nivel
de RLS** (`roles_write` exige `organization_id is not null`), no solo en
la UI — la ficha los muestra con todos los campos `readOnly` y el checklist
de permisos deshabilitado, sin `SaveDiscardBar`, con un botón "Duplicar
como rol personalizado" que copia nombre/descripción/permisos a un rol
nuevo de la organización (`duplicateRoleAsCustom`). Roles personalizados
son completamente editables: nombre, descripción, y una matriz de
checkboxes de permisos agrupada por `permissions.module`
(`setRolePermissions` hace diff contra `role_permissions` existente, no
borra e inserta todo). `RolesPage.tsx` gateada por `roles.view`, escritura
por `roles.manage`.

### Empresa

`CompanyPage.tsx` (`/empresa`) edita `activeOrg` directamente (no hay
lista/creación, cada organización solo edita la suya) — nombre, razón
social, RFC, teléfono/correo/sitio web, moneda/país/zona horaria/idioma.
`slug` y `status` de solo lectura. Gateada por `organization.view`
(lectura vía RLS ya existente `orgs_select`) y escritura por
`settings.manage` (política `orgs_update` ya existente, no se agregó
policy nueva).

### Bug real: Usuarios no cargaba ("No se pudieron cargar los miembros") (corregido en esta fase)

Mismo bug que ya se había corregido una vez en `audit_logs`
(`fix_audit_logs_user_fk_to_profiles`), reaparecido en tabla distinta:
`organization_members.user_id` apuntaba a `auth.users(id)`, no a
`public.profiles(id)`, así que el embed `profiles(first_name, last_name,
email)` de `organizationMembersApi.ts` no podía resolverse vía PostgREST y
la query completa fallaba. Corregido con
`fix_organization_members_user_fk_to_profiles` (misma técnica: la FK ahora
apunta a `public.profiles(id)`, mismo espacio de valores, sin pérdida de
integridad). **Recordatorio reforzado:** cualquier FK nueva a un
usuario/autor debe apuntar a `public.profiles`, nunca a `auth.users`, si en
algún momento se va a hacer un embed de PostgREST sobre ella.

### Deliberadamente no construido en esta fase

Mismo criterio de "no inventar sin confirmar" de siempre — cada uno
requiere una decisión de producto que no se ha pedido:

- **Inicio**: sin definir qué contenido/dashboard debe tener.
- **Incidentes/Alertas**: dependen del motor de alertas genérico (Fase 6
  del roadmap, sigue sin construirse).
- **Documentos** (vista agregada): ya existen `driver_licenses`/
  `entity_documents`/documentos de vehículo, pero no una vista cruzada de
  "todos los documentos con vencimiento" — se puede construir cuando se
  pida, agregando sobre las tablas ya existentes.
- **Reportes/Indicadores**: sin definir qué reportes/KPIs necesita el
  usuario más allá de lo que ya vive en Costos/Mantenimiento.
- **Campos personalizados/Vistas**: framework genérico grande (Fase 2b del
  roadmap), mejor esperar a que se pida explícitamente.
- **Integraciones/API**: no hay proveedor ni contrato de API definido
  todavía.
- **Suscripción**: requiere elegir procesador de pagos (Stripe u otro), no
  se puede inventar sin decisión del usuario.

## Variables de entorno

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env` (gitignored).
