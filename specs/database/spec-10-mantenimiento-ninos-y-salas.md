# SPEC-10 — Mantenimiento de niños y salas (`children` / `rooms`)

| Campo          | Valor                                                                 |
| -------------- | --------------------------------------------------------------------- |
| **Feature**    | Mantenimiento de niños y salas. Creación de salas por defecto e inserción de niños |
| **Rama**       | `feat/spec-10-mantenimiento-ninos-y-salas`                            |
| **Estado**     | `Approved`                                                               |
| **Fuente**     | `07-DB-Schema/opendaycare-database-schema.md`                          |
| **Pantalla**   | `/kid` (se mantiene la ruta existente, NO se migra a `/kids`)           |

## Descripción

Implementar el mantenimiento de las tablas `children` y `rooms` con el siguiente alcance:

- **Base de datos:** Crear **3 salas por defecto** mediante migración versionada con `apply_migration`. Una de ellas debe ser obligatoriamente **"Sala Soles"**. La tabla `children` debe quedar **vacía** (sin inserciones).
- **UI:** Añadir módulo para **insertar un niño** en la base de datos desde la pantalla `/kid`. Mantener el resto de la funcionalidad existente tal como está.

## Reglas globales

Mismas que las specs anteriores:

1. **Migraciones:** Todo cambio DDL/DML se hace con `apply_migration` del MCP de Supabase. `execute_sql` solo para consultas de verificación de solo lectura.
2. **Idioma:** Lo que se persiste en BD va en inglés cuando aplique a enums/códigos. Los nombres de salas visibles pueden mantenerse tal como se requieren ("Sala Soles"). El código de la app va en inglés, UI en español.
3. **RLS:** Respetar políticas RLS. Si hay tablas con RLS sin políticas, seguir el patrón del proyecto.
4. **Helpers de Supabase:** Usar siempre `lib/supabase/client.ts` (Client Components) y `lib/supabase/server.ts` (Server Components/Actions). No crear clientes sueltos.
5. **Ruta:** Mantener `/kid` tal como existe. No renombrar a `/kids`.
6. **Código limpio:** TypeScript, Tailwind CSS v4, sin estilos inline heredados.

## Stack técnico

- Next.js 16.4.2 — App Router, `cacheComponents: true`
- React 19 + TypeScript
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Tailwind CSS v4

## Alcance detallado

### 1. Base de datos (Migración)

**Objetivo:** Crear 3 salas por defecto asociadas al `daycare` existente.

**Pasos:**

1. Verificar si existe al menos un registro en `public.daycares`. Según la migración `20261022202655_create_daycares.sql`, ya existe "Guardería Sala Soles". Usar ese `daycare_id`.
2. Crear migración con `apply_migration({ name: "create_default_rooms", query: "..." })`.
3. Insertar **exactamente 3 salas** para ese `daycare_id`. Una de ellas **DEBE** llamarse **"Sala Soles"**.
4. **NO** insertar ningún registro en `public.children`. Debe permanecer vacía.
5. Hacer los inserts **idempotentes** (usar `WHERE NOT EXISTS`) para evitar duplicados.
6. Guardar el archivo con el formato `supabase/migrations/<version>_<snake_case_name>.sql` usando la `version` devuelta por `apply_migration`.

**Sugerencia de nombres para las 3 salas:**
- `Sala Soles` (obligatorio)
- `Sala Lunas` 
- `Sala Estrellas`

O cualquier otra combinación, siempre que una sea exactamente `Sala Soles`. Los nombres van en español ya que son visibles al usuario.

**SQL orientativo (ajustar al `daycare_id` real):**

```sql
-- SPEC-10: create default rooms
-- Migration: create_default_rooms

insert into public.rooms (daycare_id, name)
select d.id, 'Sala Soles'
from public.daycares d
where not exists (select 1 from public.rooms r where r.daycare_id = d.id and r.name = 'Sala Soles');

insert into public.rooms (daycare_id, name)
select d.id, 'Sala Lunas'
from public.daycares d
where not exists (select 1 from public.rooms r where r.daycare_id = d.id and r.name = 'Sala Lunas');

insert into public.rooms (daycare_id, name)
select d.id, 'Sala Estrellas'
from public.daycares d
where not exists (select 1 from public.rooms r where r.daycare_id = d.id and r.name = 'Sala Estrellas');
```

### 2. UI - Módulo para insertar niño en `/kid`

**Objetivo:** Permitir agregar un niño a la base de datos desde la pantalla `/kid`.

**Estado actual:**
- Ya existe `app/_components/add-child-modal.tsx` con validaciones (nombre, fecha de nacimiento). El botón "Agregar niño" ya está en `app/kid/page.tsx`.
- Actualmente el modal solo cierra (`setIsOpen(false)`) sin guardar en BD.
- Existe `lib/rooms.ts` con `ROOMS` mock.

**Cambios necesarios:**

#### `lib/rooms.ts` (modificar o crear)
- Obtener salas desde Supabase en lugar de datos mock, o mantener compatibilidad.
- Si se obtienen desde BD, crear función para fetch de rooms.

#### `app/_components/add-child-modal.tsx` (modificar)
- Convertir a Client Component con lógica para guardar en Supabase.
- Al enviar el formulario:
  1. Validar campos (mantener validaciones existentes)
  2. Obtener datos: `full_name`, `birth_date` (convertir dd/mm/aaaa a `YYYY-MM-DD`), `room_id`, `allergy_tags` (parsear de texto a `text[]`), `medical_notes`, `photo_consent` (default `true`), `status` (default `active`), `enrolled_at` (fecha actual)
  3. Insertar en `public.children` usando `createClient()` de `lib/supabase/client.ts`
  4. Manejar errores (mostrar mensaje si falla)
  5. Cerrar modal y refrescar la página/lista de niños

**Campos del formulario:**
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `full_name` | text | Sí | Ya validado |
| `birth_date` | date | Sí | Convertir de dd/mm/aaaa a YYYY-MM-DD |
| `room_id` | uuid (select) | Sí | Obtener de `rooms` |
| `allergy_tags` | text[] | No | Parsear input "Maní, Lactosa" a `["peanut", "lactose"]` o mantener en inglés según lo que ingrese el usuario. Seguir convención: valores en inglés. |
| `medical_notes` | text | No | Texto libre |
| `photo_consent` | boolean | No | Default `true` (no mostrar en modal por ahora, usar default) |
| `status` | child_status | No | Default `active` |
| `enrolled_at` | date | No | Default `now()` |

#### `app/kid/page.tsx` (modificar)
- Obtener niños desde Supabase en lugar de `@/lib/children` mock (o mantener ambos modos)
- Obtener salas para mostrar en el header/separador y para el modal
- Filtrar por sala si es necesario (mostrar "SALA SOLES" o agrupar por salas)
- El contador debe mostrar niños reales de BD

#### `lib/children.ts` (evaluar)
- Puede mantenerse para compatibilidad o reemplazarse por funciones de fetch

**Permisos:**
- Solo usuarios con rol `staff` o `admin` deberían poder agregar niños. Verificar rol desde `users` table.
- Respetar RLS de `children` y `rooms`.

## Plan de implementación

### Fase 1: Base de datos
1. **Inspeccionar estado actual** - Verificar `daycares` y `rooms` existentes
2. **Crear migración** - Usar `apply_migration` para insertar 3 salas (incluida "Sala Soles")
3. **Versionar migración** - Guardar archivo en `supabase/migrations/` con versión correcta
4. **Verificar** - Comprobar que existen 3 salas y `children` sigue vacía

### Fase 2: UI
1. **Actualizar fetch de rooms** - Obtener salas desde Supabase
2. **Modificar modal** - Implementar guardado en BD
3. **Actualizar página `/kid`** - Mostrar niños desde BD, mantener diseño existente
4. **Validaciones y errores** - Manejo de errores de inserción
5. **Verificación** - Probar inserción de un niño

## Criterios de aceptación

### Base de datos
- [ ] Existe migración versionada en `supabase/migrations/` con las 3 salas creadas
- [ ] Existen exactamente **3 salas** para el daycare
- [ ] Una de las salas se llama **"Sala Soles"** obligatoriamente
- [ ] La tabla `public.children` está **vacía** (sin registros)
- [ ] Los inserts son idempotentes

### UI
- [ ] Ruta `/kid` se mantiene (sin cambio a `/kids`)
- [ ] Botón "Agregar niño" abre el modal
- [ ] Al guardar, se inserta un registro en `public.children` con todos los campos correctos
- [ ] El niño aparece en la lista tras guardar (o tras recargar)
- [ ] Se pueden seleccionar las salas creadas en el dropdown
- [ ] Las validaciones existentes siguen funcionando
- [ ] Solo staff/admin pueden agregar (respetando permisos/RLS)

### Verificación general
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run lint` sin errores
- [ ] `npm run build` compila correctamente
- [ ] Código en inglés, UI en español

## Qué NO está en este spec

- Eliminación/edición de niños
- Gestión completa de salas (CRUD de salas)
- Filtros por sala en la UI
- Cambio de ruta a `/kids`
- Migración de datos existentes
- Sistema de permisos complejo (solo lo necesario para insertar)

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Múltiples daycares | Usar el daycare existente o crear uno si no existe. Verificar con consulta. |
| Duplicados de salas | Usar `WHERE NOT EXISTS` en los inserts |
| Conversión de fecha | Validar y convertir correctamente dd/mm/aaaa a YYYY-MM-DD |
| RLS bloqueando inserción | Verificar políticas. Si no existen, pueden ser necesarias pero seguir el patrón del proyecto |
| cacheComponents | Al insertar, necesitar refrescar datos. Usar `revalidatePath` o router.refresh() |
