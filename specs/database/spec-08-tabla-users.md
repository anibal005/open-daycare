# SPEC-08 — Tabla `users`, enums `user_role` / `user_status` y usuario staff de prueba

| Campo          | Valor                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **Feature**    | Tabla de perfiles `public.users`, enums de rol/estado y seed de un usuario staff para pruebas      |
| **Rama**       | `feat/spec-08-tabla-users`                                                                        |
| **Estado**     | `Implemeted`                                                                                           |
| **Fecha**      | `2026-10-23`                                                                                      |
| **Depends on** | SPEC-07 (`public.daycares` y patrón de migraciones)                                               |
| **Fuente**     | `07-DB-Schema/opendaycare-database-schema.md` (tabla 2, `users`, y enums `user_role` / `user_status`) |

## Descripción

Crear en Supabase la tabla `public.users`, que guarda el perfil de dominio de cada usuario vinculado a `auth.users`, junto con los enums `public.user_role` (`staff`, `parent`, `admin`) y `public.user_status` (`pending`, `active`).

La relación con la guardería es **1:N**: cada usuario pertenece a un solo daycare (`users.daycare_id NOT NULL`) y un daycare tiene muchos usuarios. Se siembra un usuario staff de prueba (`anibal@gmail.com`) para poder validar el login y las pantallas que dependen de un usuario autenticado.

**Alcance:**

- ✅ Crear los enums `public.user_role` y `public.user_status`.
- ✅ Crear `public.users` con las 10 columnas del db-schema: `id`, `daycare_id`, `role`, `status`, `full_name`, `avatar_url`, `notify_on_post`, `daily_summary_enabled`, `created_at`, `updated_at`.
- ✅ FK `users.id → auth.users(id) ON DELETE CASCADE` y FK `users.daycare_id → daycares(id) ON DELETE CASCADE`.
- ✅ `full_name NOT NULL` + CHECK de nombre no vacío.
- ✅ Índice `users_daycare_id_idx` para consultas por daycare.
- ✅ Función reutilizable `public.set_updated_at()` + trigger `users_set_updated_at` (`BEFORE UPDATE`).
- ✅ RLS habilitado sin políticas (deny-all para `anon`/`authenticated`).
- ✅ Seed idempotente de un usuario staff en `auth.users`, `auth.identities` y `public.users`.
- ✅ Dos migraciones versionadas: una de esquema y una de seed.
- ✅ Actualizar `supabase/README.md` con el aviso esperado de RLS para `users`.
- ❌ No se crea el trigger `AFTER INSERT` en `auth.users`; se difiere a la spec de autenticación/invitaciones.
- ❌ No se agregan políticas RLS ni funciones de aislamiento por daycare.
- ❌ No se crean `parent_children`, `invitations`, `rooms`, `children` ni el resto de tablas.
- ❌ No se crean los enums `relationship_type`, `invitation_status`, `post_type` ni `child_status`.
- ❌ No se agrega cliente Supabase, dependencias npm ni variables de entorno a la app.
- ❌ No se conecta `/login` ni ninguna pantalla a Supabase.
- ❌ No se cambia el email prellenado `caro@opendaycare.com` del mockup de login.
- ❌ No se generan tipos TypeScript del esquema.

## Reglas globales

- Nombres de tablas, columnas, enums, constraints e índices en **inglés**; los valores persistidos también (`staff`, `active`).
- Todo DDL y todo seed entran por `apply_migration` del MCP. Nunca por el dashboard, ni por `execute_sql`, ni por `psql`.
- Un archivo por migración. No hay migraciones `down`: el rollback se hace con una migración nueva.
- El nombre del archivo usa la `version` que devuelve el MCP, no un timestamp inventado.
- Las migraciones de este repo no se editan una vez aplicadas; un cambio de esquema es un archivo nuevo.
- El repo (no la base) es la fuente de verdad del esquema.
- `auth.users` es la fuente de verdad del email y la contraseña. `public.users` no duplica `email` ni `password_hash`.

## Herramientas

- Supabase (Postgres 15+) a través del MCP: `apply_migration`, `list_migrations`, `list_tables`, `execute_sql`, `get_advisors`, `get_project_url`, `get_publishable_keys`.
- Estado de partida verificado el 2026-10-23:
  - Migraciones aplicadas: `20261022195824_create_test_table`, `20261022200102_drop_test_table`, `20261022202655_create_daycares`.
  - `public.daycares` tiene 1 fila: `Guardería Sala Soles`.
  - `public.users` no existe.
  - `auth.users`, `auth.identities` y `auth.sessions` están vacías.
  - `pgcrypto` está instalado en el schema `extensions` (`extensions.crypt`, `extensions.gen_salt`).
  - No hay triggers personalizados en `auth` ni en `public`.

## Modelo de datos

### Enums

```sql
create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');
```

| Enum          | Valores                    | Uso                                                  |
| ------------- | -------------------------- | ---------------------------------------------------- |
| `user_role`   | `staff`, `parent`, `admin` | Discrimina el tipo de usuario y sus permisos futuros. |
| `user_status` | `pending`, `active`        | Estado del perfil. Default `active`.                  |

Los valores se guardan en inglés; las etiquetas de UI se traducen en la capa de presentación.

### Tabla `public.users`

| Columna                 | Tipo          | Restricciones                                                                                                  |
| ----------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`                    | `uuid`        | PK `users_pkey`, FK `users_id_fkey → auth.users(id) ON DELETE CASCADE`. Sin default: lo asigna Supabase Auth. |
| `daycare_id`            | `uuid`        | `not null`, FK `users_daycare_id_fkey → public.daycares(id) ON DELETE CASCADE`.                               |
| `role`                  | `user_role`   | `not null`. Sin default: el rol se define al crear el perfil.                                                 |
| `status`                | `user_status` | `not null`, default `'active'`.                                                                                |
| `full_name`             | `text`        | `not null`, CHECK `users_full_name_not_blank`.                                                                 |
| `avatar_url`            | `text`        | Nullable.                                                                                                      |
| `notify_on_post`        | `boolean`     | `not null`, default `true`.                                                                                    |
| `daily_summary_enabled` | `boolean`     | `not null`, default `true`.                                                                                    |
| `created_at`            | `timestamptz` | `not null`, default `now()`.                                                                                   |
| `updated_at`            | `timestamptz` | `not null`, default `now()`, mantenido por `users_set_updated_at`.                                             |

- No hay `UNIQUE` sobre `full_name` ni sobre `(daycare_id, full_name)`.
- No hay columna `email`: el email vive en `auth.users`.
- `role` no tiene default. Un seed o un flujo de signup debe declararlo explícitamente.
- `status` nace `active`; `pending` queda disponible para el flujo de invitaciones.

### Migración 1 — `create_user_enums_and_users`

```sql
-- SPEC-08: user profile table, role/status enums and updated_at trigger
-- Migration: create_user_enums_and_users

create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

create table public.users (
  id uuid primary key
    references auth.users (id) on delete cascade,
  daycare_id uuid not null
    references public.daycares (id) on delete cascade,
  role public.user_role not null,
  status public.user_status not null default 'active',
  full_name text not null,
  avatar_url text,
  notify_on_post boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_full_name_not_blank check (length(trim(full_name)) > 0)
);

create index users_daycare_id_idx on public.users (daycare_id);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
```

- `set_updated_at()` queda en `public` para reutilizarla en tablas futuras que tengan `updated_at`.
- `set search_path = ''` evita el advisor de `function_search_path_mutable` y no rompe `now()`, que vive en `pg_catalog`.
- RLS habilitado sin policies: `anon` y `authenticated` no ven ni escriben nada; `service_role` (MCP) sigue operando.

### Migración 2 — `seed_staff_user`

Seed idempotente del usuario staff de prueba:

| Dato                 | Valor                                         |
| -------------------- | --------------------------------------------- |
| `id`                 | `11111111-1111-4111-8111-111111111111`        |
| `email`              | `anibal@gmail.com`                            |
| `password`           | `123456` (solo pruebas; se guarda con bcrypt) |
| `full_name`          | `Anibal Delgado`                              |
| `role`               | `staff`                                       |
| `status`             | `active`                                      |
| `daycare`            | `Guardería Sala Soles` (resuelto por nombre)  |
| `email_confirmed_at` | `now()`                                       |

```sql
-- SPEC-08: staff user for local testing (auth + profile)
-- Migration: seed_staff_user

do $$
declare
  v_daycare_id uuid;
  v_user_id uuid := '11111111-1111-4111-8111-111111111111';
  v_email text := 'anibal@gmail.com';
  v_full_name text := 'Anibal Delgado';
begin
  select id into strict v_daycare_id
  from public.daycares
  where name = 'Guardería Sala Soles';

  select coalesce(
    (select id from auth.users where email = v_email),
    v_user_id
  ) into v_user_id;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt('123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name),
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    user_id,
    provider_id,
    provider,
    identity_data,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true
    ),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;

  insert into public.users (
    id,
    daycare_id,
    role,
    status,
    full_name
  )
  values (
    v_user_id,
    v_daycare_id,
    'staff',
    'active',
    v_full_name
  )
  on conflict (id) do nothing;
end;
$$;
```

- `select id into strict` falla si no existe `Guardería Sala Soles`: el seed no inventa un daycare.
- Si `anibal@gmail.com` ya existe en `auth.users` con otro UUID, el bloque reutiliza ese UUID en lugar de crear un duplicado.
- `on conflict do nothing` en las tres inserciones hace el seed re-ejecutable sin duplicar filas.
- `auth.users.confirmed_at` es una columna generada a partir de `email_confirmed_at`; no se inserta a mano.
- `auth.identities.email` también es generada a partir de `identity_data`; no se inserta a mano.
- `extensions.crypt(..., extensions.gen_salt('bf'))` produce un hash bcrypt compatible con Supabase Auth.
- `instance_id` usa el UUID nulo estándar de Supabase (`00000000-0000-0000-0000-000000000000`).

## Archivos

### Crear

#### `supabase/migrations/<version>_create_user_enums_and_users.sql`

El SQL de la migración 1, con la cabecera de dos líneas. Se crea **después** de aplicar, para que `<version>` coincida con el historial remoto.

#### `supabase/migrations/<version>_seed_staff_user.sql`

El SQL de la migración 2, con la cabecera de dos líneas. Se crea **después** de aplicar, con su propia `version`.

### Modificar

#### `supabase/README.md`

- Ampliar "Avisos esperados" para indicar que `public.users` también tiene RLS habilitado sin políticas, así que `rls_enabled_no_policy` es esperado para `daycares` **y** `users`.
- Agregar una nota breve: la migración `seed_staff_user` crea un usuario de prueba (`anibal@gmail.com`, rol `staff`) para desarrollo; no debe replicarse en producción. No duplicar la contraseña en el README.

### No se modifican

`app/`, `lib/`, `package.json`, `package-lock.json`, `.env`, `.env.template`, `next.config.ts`, `AGENTS.md`, `specs/*` existentes, `.gitignore`.

## Plan de implementación

1. Ejecutar `list_migrations`, `list_tables({ schemas: ["public", "auth"] })` y verificar el estado de partida: `public.users` no existe, `auth.users` tiene 0 filas y `daycares` tiene `Guardería Sala Soles`. Verificación: los conteos coinciden con los de esta spec.
2. Aplicar la migración 1 con `apply_migration({ name: "create_user_enums_and_users", query: <SQL del modelo de datos> })`. Verificación: devuelve una `version` y `list_migrations` incluye el nombre.
3. Crear `supabase/migrations/<version>_create_user_enums_and_users.sql` con el SQL exacto aplicado. Verificación: `<version>` coincide con `list_migrations` y el contenido no difiere del aplicado.
4. Verificar los enums con `pg_type` + `pg_enum`. Verificación: `user_role` tiene exactamente `staff`, `parent`, `admin`; `user_status` tiene exactamente `pending`, `active`; ambos en el schema `public`.
5. Verificar la tabla con `list_tables({ schemas: ["public"], verbose: true })` y una consulta a `information_schema.columns` + `pg_constraint` + `pg_indexes`. Verificación: 10 columnas con sus tipos, defaults, PK, las dos FKs con `ON DELETE CASCADE`, el CHECK de `full_name` y el índice `users_daycare_id_idx`.
6. Verificar la función y el trigger con `pg_proc` + `pg_trigger`. Verificación: `public.set_updated_at()` existe con `search_path = ''` y `users_set_updated_at` está en `BEFORE UPDATE` de `public.users`.
7. Verificar RLS con `pg_class.relrowsecurity` y `pg_policies`. Verificación: RLS activo y cero policies para `users`.
8. Aplicar la migración 2 con `apply_migration({ name: "seed_staff_user", query: <SQL del modelo de datos> })`. Verificación: devuelve una `version` distinta y `list_migrations` incluye el nombre.
9. Crear `supabase/migrations/<version>_seed_staff_user.sql` con el SQL exacto aplicado. Verificación: `<version>` coincide con `list_migrations`.
10. Verificar el seed con consultas de solo lectura: 1 fila en `auth.users` con `email = 'anibal@gmail.com'`, `email_confirmed_at` no nulo y `encrypted_password` que empieza con `$2`; 1 identidad `email` con `provider_id = id::text`; 1 fila en `public.users` con `role = 'staff'`, `status = 'active'`, `full_name = 'Anibal Delgado'` y `daycare_id` = el de Sala Soles. Verificar la contraseña con `encrypted_password = extensions.crypt('123456', encrypted_password)`.
11. Probar el login real contra Supabase Auth: obtener `url` con `get_project_url` y la publishable key con `get_publishable_keys`, y hacer `POST {url}/auth/v1/token?grant_type=password` con `apikey: <publishable key>` y body `{"email":"anibal@gmail.com","password":"123456"}`. Verificación: responde 200 y devuelve `access_token`. Si falla, corregir el seed (identidad/confirmación) antes de cerrar.
12. Actualizar `supabase/README.md` con los avisos de RLS y la nota del seed. Verificación: el README menciona `users` junto a `daycares` y no contiene la contraseña.
13. Ejecutar `get_advisors("security")`. Verificación: no aparece `rls_disabled_in_public` para `users`; `rls_enabled_no_policy` aparece para `users` y está documentado como esperado.
14. Cierre: `git status` solo muestra `supabase/`; `npm run lint` y `npx tsc --noEmit` terminan sin errores (no hubo cambios de app).

## Checklist de aceptación

Enums:

- [x] `public.user_role` existe y sus valores son exactamente `staff`, `parent`, `admin`, en ese orden.
- [x] `public.user_status` existe y sus valores son exactamente `pending`, `active`, en ese orden.
- [x] No se creó ninguno de los enums `relationship_type`, `invitation_status`, `post_type` ni `child_status`.

Tabla:

- [x] `list_tables` muestra `users` en el schema `public`.
- [x] `users` tiene exactamente 10 columnas: `id`, `daycare_id`, `role`, `status`, `full_name`, `avatar_url`, `notify_on_post`, `daily_summary_enabled`, `created_at`, `updated_at`.
- [x] `id` es `uuid`, `not null`, PK `users_pkey`, sin default, con FK a `auth.users(id)` y `ON DELETE CASCADE`.
- [x] `daycare_id` es `uuid`, `not null`, con FK a `public.daycares(id)` y `ON DELETE CASCADE`.
- [x] `role` es de tipo `public.user_role`, `not null`, sin default.
- [x] `status` es de tipo `public.user_status`, `not null`, default `'active'`.
- [x] `full_name` es `text`, `not null`, y existe el constraint `users_full_name_not_blank`.
- [x] Un `insert` con `full_name = ''` falla por el CHECK.
- [x] Un `insert` con `full_name = '   '` falla por el CHECK.
- [x] `avatar_url` es `text` nullable.
- [x] `notify_on_post` es `boolean`, `not null`, default `true`.
- [x] `daily_summary_enabled` es `boolean`, `not null`, default `true`.
- [x] `created_at` y `updated_at` son `timestamptz`, `not null`, default `now()`.
- [x] Existe el índice `users_daycare_id_idx` sobre `daycare_id`.
- [x] No existe una columna `email` en `public.users`.

Trigger:

- [x] Existe `public.set_updated_at()` con `search_path = ''`.
- [x] Existe el trigger `users_set_updated_at` en `BEFORE UPDATE` de `public.users`.
- [x] Un `update` sobre una fila de `users` cambia `updated_at` a un valor mayor que el anterior.

Seguridad:

- [x] `pg_class.relrowsecurity` es `true` para `public.users`.
- [x] `pg_policies` no tiene ninguna fila para `public.users`.
- [x] `get_advisors("security")` no reporta `rls_disabled_in_public` para `public.users`.

Seed:

- [x] `auth.users` tiene exactamente 1 fila y su email es `anibal@gmail.com`.
- [x] Esa fila tiene `id = '11111111-1111-4111-8111-111111111111'`, `email_confirmed_at` no nulo y `encrypted_password` con prefijo `$2`.
- [x] `encrypted_password = extensions.crypt('123456', encrypted_password)` devuelve `true`.
- [x] `auth.identities` tiene exactamente 1 fila con `provider = 'email'`, `user_id` igual al usuario y `provider_id = user_id::text`.
- [x] `public.users` tiene exactamente 1 fila y su `id` coincide con el de `auth.users`.
- [x] Esa fila tiene `role = 'staff'`, `status = 'active'`, `full_name = 'Anibal Delgado'`, `notify_on_post = true`, `daily_summary_enabled = true`.
- [x] Esa fila tiene `daycare_id` igual al id de `Guardería Sala Soles`.
- [x] `public.daycares` sigue teniendo exactamente 1 fila.
- [x] El SQL del seed usa `on conflict do nothing` en las tres inserciones y resuelve el id existente por email; una segunda ejecución no duplica filas.

Login:

- [x] `POST {url}/auth/v1/token?grant_type=password` con `anibal@gmail.com` / `123456` responde 200 y devuelve `access_token`.
- [x] El login no requiere confirmar el email (la fila nace con `email_confirmed_at`).

Migraciones:

- [x] `list_migrations` incluye `create_user_enums_and_users` y `seed_staff_user`.
- [x] La `version` de cada migración coincide con el nombre de su archivo en `supabase/migrations/`.
- [x] Existen exactamente dos archivos nuevos en `supabase/migrations/`.
- [x] El SQL de los archivos coincide con el aplicado.
- [x] `supabase/README.md` menciona `users` en los avisos de RLS y la nota del seed, sin la contraseña.

Alcance:

- [x] No existe ningún trigger `AFTER INSERT` en `auth.users`.
- [x] No se agregó ninguna política RLS.
- [x] `package.json` no cambia y no se agregó ninguna dependencia.
- [x] `app/`, `lib/`, `.env` y `AGENTS.md` no cambian por esta spec. `git status` muestra además cambios ajenos y preexistentes (`AGENTS.md`, `opencode.json`, `.opencode/agents/spec-verifier.md` y `specs/`); los cambios de esta spec están solo en `supabase/`.
- [x] `npm run lint` y `npx tsc --noEmit` terminan sin errores.

## Notas de implementación

- **Versiones aplicadas:** `20261023142644_create_user_enums_and_users` y `20261023144400_seed_staff_user`.
- **Desviación del SQL de seed propuesto:** el bloque de esta spec no bastaba para iniciar sesión. GoTrue devolvía `500 Database error querying schema` porque `confirmation_token`, `recovery_token`, `email_change_token_new` y `email_change` quedaban en `NULL` (se esperan cadenas vacías) y porque `auth.identities.id` es `NOT NULL` sin default. La migración aplicada agrega `''` en esas cuatro columnas y un `gen_random_uuid()` explícito para `auth.identities.id`. El resto del bloque quedó igual (`on conflict do nothing` en las tres inserciones y reutilización del UUID existente por email).
- **Historial limpio:** durante la implementación se aplicaron intentos intermedios del seed que fallaron o dejaron el login roto; se eliminaron sus filas de `supabase_migrations.schema_migrations` y los datos de prueba para que el historial remoto coincida exactamente con los dos archivos del repo.
- **Estado de partida del repositorio:** `git status` ya mostraba cambios ajenos a esta spec (`AGENTS.md`, `opencode.json`, `.opencode/agents/spec-verifier.md`, `specs/spec-07-tabla-daycares.md` eliminado y `specs/database/` sin trackear). No se tocaron; los cambios de esta spec son solo `supabase/` y las casillas marcadas en este archivo.
- **Advisors adicionales:** además de `rls_enabled_no_policy` para `daycares` y `users`, `get_advisors("security")` reporta avisos preexistentes sobre `public.rls_auto_enable()` y la protección de contraseñas filtradas. No pertenecen a esta spec.

## Decisiones

- **Sí:** relación 1:N con `users.daycare_id NOT NULL` (decisión del usuario). Un usuario pertenece a un solo daycare; un daycare tiene muchos usuarios. Es lo que propone el db-schema.
- **No:** tabla intermedia `daycare_users`. Un usuario multi-daycare no es un requisito actual y complicaría el aislamiento por daycare.
- **Sí:** nombre `public.users`, como el db-schema. No se usa `profiles` porque el diccionario de datos ya fijó el nombre.
- **Sí:** los 10 campos del db-schema, incluidos `avatar_url`, `notify_on_post` y `daily_summary_enabled`. Evita una migración extra cuando se implemente el perfil.
- **Sí:** solo `user_role` y `user_status`. Los otros cuatro enums pertenecen a tablas que todavía no existen.
- **Sí:** `role` sin default y `status` con default `'active'`. El rol siempre es una decisión explícita; el estado activo es el caso normal.
- **Sí:** `full_name NOT NULL` + CHECK `length(trim(full_name)) > 0`. Un perfil sin nombre no es útil y el tipo `text` permite vacíos.
- **Sí:** `avatar_url` nullable. No todos los usuarios tienen foto.
- **Sí:** `ON DELETE CASCADE` en `daycare_id` (decisión del usuario). El daycare es la entidad raíz; al borrarlo no deben quedar perfiles huérfanos.
- **Sí:** `ON DELETE CASCADE` en `id`. Coincide con la FK a `auth.users` y con el borrado de la cuenta desde Auth.
- **Sí:** índice `users_daycare_id_idx`. Todas las consultas por daycare (staff, padres, feed) van a filtrar por esa columna.
- **Sí:** función reutilizable `public.set_updated_at()` + trigger `BEFORE UPDATE` (decisión del usuario). Mantiene `updated_at` sin depender de cada query de la app.
- **Sí:** `set search_path = ''` en la función. Evita el advisor de search path mutable sin afectar `now()`.
- **Sí:** RLS habilitado sin policies (decisión del usuario). La tabla queda cerrada al cliente hasta que exista la spec de auth/lectura; el `service_role` sigue operando.
- **Sí:** dos migraciones separadas (decisión del usuario). El esquema y el seed tienen historiales independientes y el seed toca tablas internas de Auth.
- **Sí:** seed del staff en `auth.users` + `auth.identities` + `public.users` (decisión del usuario). Permite probar el login real sin depender de un alta manual.
- **Sí:** UUID fijo `11111111-1111-4111-8111-111111111111` para el staff. Hace el seed idempotente y da una referencia estable al perfil.
- **Sí:** resolver `Guardería Sala Soles` por nombre con `select id into strict`. No se hardcodea el UUID del daycare ni se inventa uno si falta.
- **Sí:** reutilizar el UUID de `auth.users` si `anibal@gmail.com` ya existe. Evita duplicados si el seed se re-ejecuta o si el usuario se creó antes.
- **Sí:** contraseña `123456` (decisión del usuario). Es solo para pruebas locales; no se usa en producción.
- **Sí:** `email_confirmed_at = now()` y `email_verified = true`. El usuario de prueba puede iniciar sesión sin pasar por confirmación de correo.
- **Sí:** verificar el login contra `/auth/v1/token`. Es la única forma de comprobar que el seed de Auth es realmente utilizable y no solo que las filas existen.
- **No:** trigger `AFTER INSERT` en `auth.users` (decisión del usuario). Se difiere a la spec de autenticación porque el signup de padres necesita validar invitación, rol y daycare.
- **No:** políticas RLS. Sin cliente Supabase en la app no hay nada que consuma la tabla; las policies llegan con auth.
- **No:** columna `email` en `public.users`. Duplicaría la fuente de verdad de Auth.
- **No:** `UNIQUE` sobre `full_name` o `(daycare_id, full_name)`. Dos personas pueden llamarse igual.
- **No:** `admin` como rol global sin daycare. Con `daycare_id NOT NULL`, un admin también pertenece a una guardería; si se necesita un superadmin global, va en otra spec.
- **No:** cambiar el email prellenado del mockup de login. `/login` sigue siendo visual y no está conectado a Supabase.
- **No:** tipos TypeScript generados. Sin cliente Supabase en la app no hay dónde consumirlos.

## Riesgos

| Riesgo                                                                                                       | Mitigación                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Insertar en `auth.users` / `auth.identities` usa tablas internas de GoTrue y puede romperse en una actualización de Supabase. | El seed está aislado en una migración propia y documentado; se verifica con un login real. Si Auth cambia, el usuario se recrea por la Admin API sin tocar el esquema. |
| `123456` es una contraseña débil.                                                                            | Es exclusivamente para pruebas locales; el README aclara que el seed no va a producción y la spec no la usa en ningún flujo de la app.                                 |
| El email `anibal@gmail.com` ya existe con otro UUID.                                                         | El bloque resuelve el UUID existente por email y reutiliza esa cuenta; antes de aplicar se verifica que `auth.users` esté vacío.                                       |
| El login falla aunque las filas existan (identidad o confirmación mal armadas).                              | El plan incluye un `POST /auth/v1/token` real como verificación obligatoria antes de cerrar.                                                                           |
| RLS sin policies deja `users` invisible para la app.                                                         | Es intencional: todavía no hay cliente Supabase. Las policies llegan con la spec de auth/lectura.                                                                     |
| Borrar un daycare borra todos sus usuarios.                                                                  | Es la decisión acordada y coincide con el cascade de `auth.users`; el borrado de un daycare debe tratarse como una operación destructiva.                             |
| `set_updated_at()` se reutiliza en tablas futuras y alguien la redefine de forma incompatible.               | La función vive en `public` con un contrato mínimo (asignar `now()` a `updated_at`); cualquier cambio debe ser una migración nueva.                                    |
| `trim()` no elimina espacios no separables (NBSP).                                                           | El nombre del seed es controlado; el CHECK cubre el caso real de espacios ASCII.                                                                                       |
| `get_advisors` reporta `rls_enabled_no_policy` para `users`.                                                  | Es un aviso informativo esperado; se documenta en `supabase/README.md` junto al de `daycares`.                                                                         |

## Qué **no** está en este spec

- Trigger `AFTER INSERT` en `auth.users` para crear perfiles automáticamente.
- Políticas RLS y funciones de aislamiento por daycare.
- Cliente Supabase en la app, dependencias npm y variables de entorno.
- Autenticación real en `/login`, signup, recuperación de contraseña y activación de cuenta.
- `parent_children`, `invitations`, `rooms`, `children`, `posts` y el resto del diccionario.
- Enums `relationship_type`, `invitation_status`, `post_type` y `child_status`.
- Tipos TypeScript generados desde el esquema.
- Cambiar el email prellenado `caro@opendaycare.com` del mockup de login.
- Limpieza de las migraciones de prueba del historial remoto.

Cada uno de esos puntos, si entra, va en su propia spec.
