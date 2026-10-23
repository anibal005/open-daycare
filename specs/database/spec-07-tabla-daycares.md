# SPEC-07 — Tabla `daycares` en Supabase y patrón de migraciones

| Campo          | Valor                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- |
| **Feature**    | Primera tabla de dominio (`daycares`) aplicada a Supabase con migraciones versionadas |
| **Rama**       | `feat/spec-07-tabla-daycares`                                                         |
| **Estado**     | `Implemented`                                                                            |
| **Fecha**      | `2026-10-22`                                                                          |
| **Depends on** | Ninguna                                                                               |
| **Fuente**     | `07-DB-Schema/opendaycare-database-schema.md` (tabla 1, `daycares`)                   |

## Descripción

Crear la tabla `public.daycares` en el proyecto Supabase y dejar instalado el **patrón de migraciones** que se usará para el resto del esquema: un archivo SQL versionado en `supabase/migrations/` por cada migración aplicada con el MCP, más un `supabase/README.md` que documenta el flujo.

La migración crea la tabla, habilita RLS sin políticas, exige `name` no vacío y siembra `Guardería Sala Soles` de forma idempotente.

**Alcance:**

- ✅ Crear `public.daycares` con `id`, `name`, `created_at`.
- ✅ Habilitar RLS sin políticas (deny-all para `anon`/`authenticated`).
- ✅ `name NOT NULL` + CHECK de nombre no vacío.
- ✅ Seed idempotente de `Guardería Sala Soles` en la misma migración.
- ✅ Crear `supabase/migrations/<version>_create_daycares.sql` con el SQL exacto aplicado.
- ✅ Crear `supabase/README.md` con el flujo `apply_migration` → capturar `version` → nombrar el archivo.
- ❌ No se instala la Supabase CLI, no hay `supabase/config.toml`, no hay Docker ni scripts npm nuevos.
- ❌ No se agregan dependencias (`@supabase/supabase-js`, `@supabase/ssr`) ni clientes en `lib/`.
- ❌ No se generan tipos TypeScript del esquema.
- ❌ No se crean `users`, `rooms` ni ninguna otra tabla.
- ❌ No se agregan políticas de acceso; la tabla queda inaccesible desde el cliente hasta que exista una spec de auth/lectura.
- ❌ No se toca `app/`, `lib/`, `package.json`, `.env` ni `AGENTS.md`.
- ❌ No se limpian las migraciones de prueba `create_test_table` / `drop_test_table` del historial remoto.

## Reglas globales

- Nombres de tabla, columnas y constraints en **inglés**; el dato sembrado va en español porque es copy de UI.
- Todo DDL entra por `apply_migration` del MCP. Nunca por el dashboard, ni por `execute_sql`, ni por `psql`.
- Un archivo por migración. No hay migraciones `down`: el rollback se hace con una migración nueva.
- El nombre del archivo usa la `version` que devuelve el MCP, no un timestamp inventado.
- Las migraciones de este repo no se editan una vez aplicadas; un cambio de esquema es un archivo nuevo.
- El repo (no la base) es la fuente de verdad del esquema.

## Herramientas

- Supabase (Postgres 15+) a través del MCP: `apply_migration`, `list_migrations`, `list_tables`, `execute_sql`, `get_advisors`.
- Estado de partida verificado: `public` vacío y dos migraciones de prueba (`20261022195824_create_test_table`, `20261022200102_drop_test_table`).

## Modelo de datos

Migración `create_daycares` (SQL completo, tal como se aplica):

```sql
create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint daycares_name_not_blank check (length(trim(name)) > 0)
);

alter table public.daycares enable row level security;

insert into public.daycares (name)
select 'Guardería Sala Soles'
where not exists (
  select 1 from public.daycares where name = 'Guardería Sala Soles'
);
```

| Columna      | Tipo          | Restricciones                                   |
| ------------ | ------------- | ----------------------------------------------- |
| `id`         | `uuid`        | PK `daycares_pkey`, `default gen_random_uuid()` |
| `name`       | `text`        | `not null`, CHECK `daycares_name_not_blank`     |
| `created_at` | `timestamptz` | `not null`, `default now()`                     |

- No hay `updated_at` ni `UNIQUE (name)`: el doc de referencia lista solo esas tres columnas.
- `gen_random_uuid()` es nativo en Postgres 13+; no requiere `pgcrypto`.
- El seed es idempotente por nombre: re-ejecutarlo no duplica.
- RLS habilitado sin policies: `anon` y `authenticated` no ven ni escriben nada; el `service_role` (MCP) sigue operando.

## Archivos

### Crear

#### `supabase/README.md`

Contenido mínimo:

1. Qué es: historial de migraciones aplicadas a Supabase, una por archivo.
2. Flujo de una migración nueva:
   1. Redactar el SQL (DDL y, si aplica, datos).
   2. `list_migrations` para ver el último `version` aplicado.
   3. Aplicar con `apply_migration({ name, query })`.
   4. Capturar la `version` devuelta.
   5. Crear `supabase/migrations/<version>_<name>.sql` con el SQL exacto.
   6. Verificar con `list_tables` + `get_advisors`.
3. Convención de nombre: `<version>_<snake_case_name>.sql`, con `version` idéntica a `supabase_migrations.schema_migrations.version`.
4. Prohibiciones: no DDL por dashboard/`execute_sql`, no editar migraciones ya aplicadas, no `supabase init` por ahora.
5. Verificación: `select version, name from supabase_migrations.schema_migrations order by version;`.

#### `supabase/migrations/<version>_create_daycares.sql`

El SQL del bloque anterior, con un comentario de cabecera de dos líneas (`-- SPEC-07: first domain table (daycares)` y el nombre lógico de la migración). El archivo se crea **después** de aplicar, para que `<version>` coincida con el historial remoto.

### No se modifican

`app/`, `lib/`, `package.json`, `package-lock.json`, `.env`, `.env.template`, `next.config.ts`, `AGENTS.md`, `specs/*` existentes, `.gitignore`.

## Plan de implementación

1. Crear `supabase/README.md` con el flujo, la convención de nombre y las prohibiciones. Verificación: el README permite ejecutar los 6 pasos sin ambigüedad.
2. Aplicar la migración con `apply_migration({ name: "create_daycares", query: <SQL del modelo de datos> })`. Verificación: devuelve una `version` y `list_migrations` incluye `create_daycares`.
3. Crear `supabase/migrations/<version>_create_daycares.sql` con el SQL exacto aplicado. Verificación: `<version>` coincide con `list_migrations` y el contenido no difiere del aplicado.
4. Verificar estructura con `list_tables({ schemas: ["public"], verbose: true })` y una consulta a `information_schema.columns` + `pg_constraint`. Verificación: 3 columnas con sus tipos, defaults, PK y CHECK.
5. Verificar RLS con `pg_class.relrowsecurity` y `pg_policies`. Verificación: RLS activo y cero policies para `daycares`.
6. Verificar el seed: `select count(*) from public.daycares where name = 'Guardería Sala Soles'` da 1; re-ejecutar el bloque `insert ... where not exists` y volver a contar. Verificación: sigue en 1.
7. Ejecutar `get_advisors("security")`. Verificación: no aparece `rls_disabled_in_public` para `daycares`; si aparece `rls_enabled_no_policy`, se anota como esperado en el README.
8. Cierre: `git status` solo muestra `supabase/`; `npm run lint` y `npx tsc --noEmit` sin errores (no hubo cambios de app).

## Checklist de aceptación

Esquema:

- [x] `list_tables` muestra `daycares` en el schema `public`.
- [x] `id` es `uuid`, `not null`, con `default gen_random_uuid()` y PK `daycares_pkey`.
- [x] `name` es `text` y `not null`.
- [x] `created_at` es `timestamptz`, `not null`, con `default now()`.
- [x] La tabla no tiene columna `updated_at`.
- [x] Existe el constraint `daycares_name_not_blank` y `name` no tiene `UNIQUE`.
- [x] Un `insert` con `name = ''` falla por el CHECK.
- [x] Un `insert` con `name = '   '` falla por el CHECK.

Seguridad:

- [x] `pg_class.relrowsecurity` es `true` para `public.daycares`.
- [x] `pg_policies` no tiene ninguna fila para `public.daycares`.
- [x] `get_advisors("security")` no reporta `rls_disabled_in_public` para `public.daycares`.

Datos:

- [x] `select count(*) from public.daycares` devuelve exactamente 1.
- [x] Esa fila tiene `name = 'Guardería Sala Soles'` y `created_at` no nulo.
- [x] Re-ejecutar el bloque de seed deja el conteo en 1 (idempotente).

Migraciones:

- [x] `list_migrations` incluye `create_daycares` con la misma `version` que el nombre del archivo.
- [x] Existe exactamente un archivo nuevo en `supabase/migrations/`: `<version>_create_daycares.sql`.
- [x] El SQL del archivo contiene los cuatro bloques: `create table`, `enable row level security`, `check` e `insert`.
- [x] `supabase/README.md` existe y describe aplicar → capturar `version` → nombrar archivo.
- [x] El README prohíbe DDL fuera de `apply_migration` y la edición de migraciones ya aplicadas.

Alcance:

- [x] `package.json` no cambia y no se agregó ninguna dependencia.
- [x] `app/`, `lib/`, `.env` y `AGENTS.md` no cambian (`git status` solo muestra `supabase/`).
- [x] `npm run lint` y `npx tsc --noEmit` terminan sin errores.

## Decisiones

- **Sí:** solo base de datos. Ninguna pantalla consume datos reales todavía (SPEC-01 a SPEC-06 son visuales con mock data); conectar Supabase a la app es otra spec.
- **Sí:** `supabase/migrations/` como carpeta. Es la ruta que la CLI espera, así que una adopción futura no obliga a mover archivos.
- **Sí:** archivos SQL en el repo + `apply_migration` del MCP. Da historial reproducible y no suma tooling, token ni Docker.
- **Sí:** el archivo se nombra con la `version` que devuelve el MCP. Es la única forma de que el repo y `supabase_migrations.schema_migrations` coincidan sin CLI.
- **Sí:** DDL y seed en una sola migración. Decisión del usuario; se compensa con un seed idempotente.
- **Sí:** seed idempotente por nombre (`where not exists`). Se puede re-aplicar y no hardcodea un UUID generado.
- **Sí:** `id` con `gen_random_uuid()` nativo. `pgcrypto` ya no es necesario en Postgres 13+.
- **Sí:** `name` y `created_at` `NOT NULL`. Una fila sin nombre o sin fecha no describe una guardería; el default evita tener que pasarla en cada insert.
- **Sí:** CHECK `length(trim(name)) > 0`. Evita filas con nombre vacío o solo espacios, algo que el tipo `text` permite.
- **Sí:** RLS habilitado sin policies. Deja la tabla cerrada al cliente (deny-all) y evita el advisor de RLS deshabilitado, sin inventar reglas de acceso antes de tener autenticación real.
- **Sí:** `updated_at` queda para la spec que introduzca edición de daycares. El doc de referencia no lo lista en esta tabla.
- **No:** `UNIQUE (name)`. Dos guarderías podrían llamarse igual en el futuro y el doc no lo pide; el seed no lo necesita.
- **No:** `supabase init`, `config.toml`, `supabase link` ni `db push`. Requieren CLI y, para desarrollo local, Docker.
- **No:** revocar grants a `anon`/`authenticated`. RLS sin policies ya bloquea; revocar complica las policies futuras.
- **No:** tipos TypeScript generados (`supabase gen types`). Sin cliente Supabase en la app no hay dónde consumirlos.
- **No:** trigger genérico de `updated_at`. No hay columna que lo use.
- **No:** borrar `create_test_table` / `drop_test_table` del historial. Es historial inmutable; la tabla de prueba ya no existe.

## Riesgos

| Riesgo                                                         | Mitigación                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| El `version` del archivo no coincide con el remoto             | Se aplica primero y se nombra el archivo con la `version` devuelta; el README lo marca como paso obligatorio.           |
| Alguien aplica DDL directo por dashboard y el repo se desfasa | El README prohíbe DDL fuera de `apply_migration` y define el chequeo `select version, name from supabase_migrations...`. |
| Re-ejecutar la migración completa falla en `create table`      | Es esperado: las migraciones se aplican una vez. La idempotencia aplica solo al bloque de seed.                         |
| El seed idempotente por nombre no tiene `UNIQUE` de respaldo   | Las migraciones corren una vez y en serie; el README advierte no re-ejecutar el archivo a mano.                          |
| RLS sin policies deja la tabla invisible para la app           | Intencional: todavía no hay cliente Supabase. Las policies llegan con la spec de auth/lectura.                          |
| `trim()` no elimina espacios no separables (NBSP)              | El nombre se carga por seed, no por input libre; el CHECK cubre el caso real (espacios ASCII).                          |
| `get_advisors` reporta `rls_enabled_no_policy`                  | Es un aviso informativo, no un bloqueo; el README lo documenta como estado esperado.                                    |

## Qué **no** está en este spec

- Cliente Supabase en la app (`lib/supabase/*`), dependencias npm y variables de entorno de cliente.
- Tipos TypeScript generados desde el esquema.
- Políticas RLS de lectura/escritura y cualquier flujo de autenticación real.
- Tablas `users`, `rooms`, `children` y el resto del diccionario de `07-DB-Schema`.
- `updated_at` y triggers de auditoría.
- Supabase CLI, `supabase/config.toml`, `supabase link`, `db push` y desarrollo local con Docker.
- Conectar el feed o cualquier pantalla a datos reales.
- Limpieza de las migraciones de prueba del historial remoto.

Cada uno de esos puntos, si entra, va en su propia spec.
