# SPEC-11 (database) — Tablas `posts`, `post_children`, `post_photos`, `reactions` y `comments` + bucket privado `post-photos`

| Campo          | Valor                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Feature**    | Persistencia del feed: publicaciones del staff, niños etiquetados, fotos privadas, reacciones y comentarios                 |
| **Rama**       | `feat/spec-11-posts-fotos-reacciones-comentarios`                                                                            |
| **Estado**     | `Approved`                                                                                            |
| **Fecha**      | `2026-11-04`                                                                                                                 |
| **Depends on** | SPEC-07 (`daycares`), SPEC-08 (`users`), SPEC-10 database (`rooms`, `children`, `parent_children`)                            |
| **Fuente**     | `07-DB-Schema/opendaycare-database-schema.md` (tablas 7 a 11) + decisiones de la sesión de grilling                          |
| **Spec UI**    | `specs/spec-11-publicaciones-staff-con-fotos.md`                                                                             |

## Descripción

Crear el modelo de datos que necesita la publicación real de entradas del staff: el enum `post_type`, las tablas `posts`, `post_children`, `post_photos`, `reactions` y `comments`, la función transaccional `create_post`, las políticas RLS para el aislamiento por guardería y el bucket privado `post-photos` donde viven los archivos.

La feature de UI asociada (SPEC-11 UI) consume este esquema para que "Publicar" en el modal de `crear-publicacion.dc.html` cree una fila real y el feed de `/` se lea de Supabase. En esta entrega las reacciones y los comentarios se crean **solo a nivel de esquema**: la UI de dar like y comentar queda para otra spec, pero los contadores del feed ya se calculan desde estas tablas (hoy siempre `0`).

**Alcance:**

- ✅ Enum `public.post_type` con 7 valores: `meal`, `nap`, `activity`, `achievement`, `mood`, `photo`, `announcement`.
- ✅ Tabla `public.posts` con `daycare_id`, `author_id`, `room_id`, `type`, `title`, `body`, `published_at` y timestamps.
- ✅ Tabla intermedia `public.post_children` con PK compuesta.
- ✅ Tabla `public.post_photos` con `storage_path`, `alt`, `width`, `height` y `position`.
- ✅ Tablas `public.reactions` y `public.comments` (esquema, RLS e índices).
- ✅ Funciones auxiliares `public.current_daycare_id()` y `public.is_active_staff()` para las políticas.
- ✅ Función `public.create_post(...)` (RPC) que inserta el post, sus niños etiquetados y sus fotos en una sola transacción.
- ✅ Índices, CHECKs y triggers `set_updated_at()` reutilizando la función de SPEC-08.
- ✅ RLS habilitado en las 5 tablas nuevas, con políticas de lectura/escritura **solo para staff/admin activos de la misma guardería**.
- ✅ Bucket privado `post-photos` (5 MB, `image/webp`, `image/jpeg`, `image/png`) y políticas de `storage.objects` limitadas al prefijo `<daycare_id>/`.
- ✅ Seed idempotente de las 3 publicaciones del mockup.
- ✅ Nota en `supabase/README.md` sobre el bucket y el alcance staff-only.
- ❌ Políticas de lectura para padres (feed de familia). Se agregan en la spec del feed de padres.
- ❌ Edición o borrado de publicaciones (no hay políticas `UPDATE`/`DELETE` para `posts`).
- ❌ UI de reacciones y comentarios.
- ❌ Límite de 2 fotos por publicación a nivel DB: queda validado en la Server Action (un CHECK no puede contar filas hermanas).
- ❌ Realtime, notificaciones y `notify_on_post` (la columna existe en `users` desde SPEC-08).
- ❌ Tipos TypeScript generados desde el esquema.

## Reglas globales

- Nombres de tablas, columnas, enums, constraints, índices, funciones y políticas en **inglés**; los valores persistidos también (`meal`, `staff`). Las etiquetas en español viven en la UI.
- Todo el DDL y todo seed entran por `apply_migration` del MCP. Nunca por dashboard, `execute_sql` ni `psql`.
- Un archivo por migración, con la `version` que devuelve `apply_migration`. No se inventa el timestamp.
- Las migraciones aplicadas no se editan. Un cambio de esquema es un archivo nuevo. No hay migraciones `down`.
- El repo es la fuente de verdad del esquema.
- `service_role` (MCP) sigue operando sin RLS; el cliente de la app usa la publishable key y respeta las políticas.

## Estado de partida (verificado el 2026-11-04)

- Migraciones aplicadas: 10 (última `20261030153903_create_rooms_children_and_enums...`).
- `public.daycares`: 1 fila (`Guardería Sala Soles`, id `e4045cb8-f59a-48a6-843d-73c0e1097974`).
- `public.users`: 2 filas — `anibal@gmail.com` (`staff`, `active`, `Anibal Delgado`, id `11111111-1111-4111-8111-111111111111`) y una cuenta `parent` (`15c36cf4-7a99-47b9-ace2-3366d80532b9`).
- `public.rooms`: 3 filas — `Sala Soles`, `Sala Lunas`, `Sala Estrellas`, todas del mismo daycare.
- `public.children`: 2 filas — `Thiago Cuadros` (Sala Soles) y `Celeste Delgado` (Sala Estrellas); ambas `active` y con `photo_consent = true`.
- `public.parent_children`: 1 fila.
- **No existen** `posts`, `post_children`, `post_photos`, `reactions`, `comments` ni el enum `post_type`.
- `storage.buckets` está vacío y `storage.objects` no tiene políticas (RLS sí está habilitado por Supabase).
- Extensiones y helpers: `public.set_updated_at()` ya existe (SPEC-08), `pgcrypto` está en `extensions`.

## Modelo de datos

### Enum `public.post_type`

```sql
create type public.post_type as enum (
  'meal',
  'nap',
  'activity',
  'achievement',
  'mood',
  'photo',
  'announcement'
);
```

Se agrega `mood` (Ánimo) porque la UI de SPEC-06 ya expone 7 chips y el catálogo de tipos es compartido entre feed y modal. El diccionario original tenía 6; la diferencia se documenta en Decisiones.

### Funciones auxiliares

```sql
create function public.current_daycare_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select u.daycare_id
  from public.users u
  where u.id = (select auth.uid());
$$;

create function public.is_active_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('staff', 'admin')
  );
$$;
```

- `security invoker` + `set search_path = ''`: no escalan privilegios y evitan el advisor de search path mutable.
- `auth.uid()` queda calificado porque `search_path` está vacío.
- Sin usuario autenticado devuelven `null`/`false`, así que las políticas niegan por defecto.

### Tabla `public.posts`

| Columna        | Tipo          | Restricciones                                                                                  |
| -------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `id`           | `uuid`        | PK `posts_pkey`, default `gen_random_uuid()`.                                                  |
| `daycare_id`   | `uuid`        | `not null`, FK `posts_daycare_id_fkey → public.daycares(id) ON DELETE CASCADE`.                |
| `author_id`    | `uuid`        | `not null`, FK `posts_author_id_fkey → public.users(id) ON DELETE CASCADE`.                    |
| `room_id`      | `uuid`        | Nullable, FK `posts_room_id_fkey → public.rooms(id) ON DELETE SET NULL`. No se usa todavía.     |
| `type`         | `post_type`   | `not null`.                                                                                    |
| `title`        | `text`        | Nullable. CHECK `posts_title_not_blank`: `null` o `trim` no vacío.                             |
| `body`         | `text`        | `not null`. CHECK `posts_body_not_blank` y `posts_body_max_length` (`char_length <= 2000`).    |
| `published_at` | `timestamptz` | `not null`, default `now()`.                                                                   |
| `created_at`   | `timestamptz` | `not null`, default `now()`.                                                                   |
| `updated_at`   | `timestamptz` | `not null`, default `now()`, mantenido por el trigger `posts_set_updated_at`.                   |

- `daycare_id` **no está en el diccionario**, pero es imprescindible para aislar el feed por guardería incluso cuando `room_id` es `null` (audiencia "toda la sala"). Sin esta columna, la política dependería del daycare del autor y las publicaciones cambiarían de tenant si un usuario se mueve.
- `room_id` queda en `null` en esta entrega: "Toda la sala" significa **todos los niños activos del daycare**, no una sala puntual.
- `title` no se completa desde el modal (el mockup no tiene campo de título); se deja para futuras publicaciones con encabezado.

### Tabla `public.post_children`

| Columna    | Tipo   | Restricciones                                                |
| ---------- | ------ | ------------------------------------------------------------ |
| `post_id`  | `uuid` | `not null`, FK → `public.posts(id) ON DELETE CASCADE`.       |
| `child_id` | `uuid` | `not null`, FK → `public.children(id) ON DELETE CASCADE`.    |
|            |        | PK compuesta `post_children_pkey (post_id, child_id)`.       |

- Un post sin filas acá se interpreta como "toda la sala". La Server Action impide publicar sin destinatarios, así que las dos audiencias son mutuamente excluyentes.

### Tabla `public.post_photos`

| Columna        | Tipo        | Restricciones                                                                     |
| -------------- | ----------- | --------------------------------------------------------------------------------- |
| `id`           | `uuid`      | PK, default `gen_random_uuid()`.                                                   |
| `post_id`      | `uuid`      | `not null`, FK → `public.posts(id) ON DELETE CASCADE`.                             |
| `storage_path` | `text`      | `not null`, UNIQUE `post_photos_storage_path_key`.                                 |
| `alt`          | `text`      | Nullable. Texto alternativo generado por la app.                                   |
| `width`        | `int`       | Nullable, CHECK `width > 0`.                                                       |
| `height`       | `int`       | Nullable, CHECK `height > 0`.                                                      |
| `position`     | `int`       | `not null`, default `0`, CHECK `position >= 0`, UNIQUE `(post_id, position)`.      |
| `created_at`   | `timestamptz` | `not null`, default `now()`.                                                     |

- Se reemplaza `url` del diccionario por `storage_path`. El bucket es privado: guardar una URL firmada no sirve porque expira. El path permite regenerar la signed URL en cada request.
- Se agrega `alt`, que el diccionario no tenía, porque las imágenes son contenido y necesitan texto alternativo.
- El límite de 2 fotos por publicación se valida en la Server Action. Un CHECK de Postgres no puede contar filas hermanas sin un trigger, y no se agrega un trigger por una regla de producto.

### Tabla `public.reactions`

| Columna      | Tipo          | Restricciones                                                          |
| ------------ | ------------- | ---------------------------------------------------------------------- |
| `id`         | `uuid`        | PK, default `gen_random_uuid()`.                                        |
| `post_id`    | `uuid`        | `not null`, FK → `public.posts(id) ON DELETE CASCADE`.                  |
| `user_id`    | `uuid`        | `not null`, FK → `public.users(id) ON DELETE CASCADE`.                  |
| `type`       | `text`        | `not null`, default `'love'`, CHECK `type in ('love')`.                 |
| `created_at` | `timestamptz` | `not null`, default `now()`.                                            |
|              |               | UNIQUE `reactions_one_per_user (post_id, user_id)`.                     |

### Tabla `public.comments`

| Columna        | Tipo          | Restricciones                                                       |
| -------------- | ------------- | ------------------------------------------------------------------- |
| `id`           | `uuid`        | PK, default `gen_random_uuid()`.                                     |
| `post_id`      | `uuid`        | `not null`, FK → `public.posts(id) ON DELETE CASCADE`.               |
| `author_id`    | `uuid`        | `not null`, FK → `public.users(id) ON DELETE CASCADE`.               |
| `body`         | `text`        | `not null`, CHECK no vacío y `char_length <= 1000`.                  |
| `created_at`   | `timestamptz` | `not null`, default `now()`.                                         |
| `updated_at`   | `timestamptz` | `not null`, default `now()`, trigger `comments_set_updated_at`.      |

### Función `public.create_post(...)`

Supabase no permite insertar filas hermanas (`post_children`, `post_photos`) en el mismo request que el `post`: PostgREST solo anida inserciones a través de relaciones many-to-one. Hacer tres inserts desde la Server Action deja un post huérfano si el segundo o el tercero falla, y el cliente no puede limpiarlo porque `posts` no tiene política `DELETE`. Por eso la creación entra por una función `security invoker` que corre en una sola transacción y sigue respetando RLS.

```sql
create function public.create_post(
  p_id uuid,
  p_type public.post_type,
  p_body text,
  p_child_ids uuid[] default '{}'::uuid[],
  p_photos jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_daycare_id uuid := public.current_daycare_id();
  v_photo_count int := coalesce(jsonb_array_length(p_photos), 0);
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_daycare_id is null or not public.is_active_staff() then
    raise exception 'create_post_not_authorized' using errcode = '42501';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'create_post_body_required' using errcode = '23514';
  end if;

  if v_photo_count > 2 then
    raise exception 'create_post_too_many_photos' using errcode = '23514';
  end if;

  if v_photo_count > 0 then
    if exists (
      select 1
      from jsonb_array_elements(p_photos) as photo
      where photo->>'storage_path' is null
         or (photo->>'storage_path') not like
            v_daycare_id::text || '/' || p_id::text || '/%'
    ) then
      raise exception 'create_post_invalid_storage_path' using errcode = '23514';
    end if;
  end if;

  insert into public.posts (id, daycare_id, author_id, type, body)
  values (p_id, v_daycare_id, (select auth.uid()), p_type, v_body);

  if p_child_ids is not null and cardinality(p_child_ids) > 0 then
    insert into public.post_children (post_id, child_id)
    select p_id, child_id
    from unnest(p_child_ids) as child_id
    on conflict do nothing;
  end if;

  if v_photo_count > 0 then
    insert into public.post_photos (
      post_id, storage_path, alt, width, height, position
    )
    select
      p_id,
      photo->>'storage_path',
      nullif(btrim(coalesce(photo->>'alt', '')), ''),
      (photo->>'width')::int,
      (photo->>'height')::int,
      (ordinality - 1)::int
    from jsonb_array_elements(p_photos) with ordinality as t(photo, ordinality);
  end if;

  return p_id;
end;
$$;

revoke execute on function
  public.create_post(uuid, public.post_type, text, uuid[], jsonb)
  from public, anon;
grant execute on function
  public.create_post(uuid, public.post_type, text, uuid[], jsonb)
  to authenticated;
```

- `security invoker`: cada `insert` pasa por las políticas de esta spec; el autor es siempre `auth.uid()` y el daycare sale de `current_daycare_id()`, no de un parámetro.
- `p_id` lo genera el cliente para que el path de Storage (`<daycare_id>/<post_id>/<position>.<ext>`) coincida con la fila de `post_photos`.
- El guard de `storage_path` exige el prefijo `<daycare_id>/<p_id>/`; un path de otro post o de otro tenant se rechaza antes de insertar.
- El límite de 2 fotos y el body no vacío se revalidan acá además de en la Server Action: la función es un endpoint público para `authenticated`.
- `on conflict do nothing` tolera ids de niño repetidos; las políticas de `post_children` siguen validando que el niño sea activo y del daycare.
- Los errores viajan con `errcode` (`42501` para permisos, `23514` para reglas) y la Server Action los traduce sin exponer el detalle.
- Con `search_path = ''` todas las funciones de `pg_catalog` (`btrim`, `char_length`, `jsonb_array_length`, `jsonb_array_elements`, `cardinality`, `unnest`) siguen resolviendo; `auth.uid()` y las funciones `public.*` van calificadas.

### Índices

```sql
create index posts_daycare_id_published_at_idx
  on public.posts (daycare_id, published_at desc);
create index posts_author_id_idx on public.posts (author_id);
create index posts_room_id_idx on public.posts (room_id) where room_id is not null;

create index post_children_child_id_idx on public.post_children (child_id);

create index reactions_user_id_idx on public.reactions (user_id);

create index comments_post_id_created_at_idx
  on public.comments (post_id, created_at);
```

`post_photos` no necesita un índice extra sobre `post_id`: el UNIQUE `(post_id, position)` ya sirve como índice de prefijo. Lo mismo para `post_children` con su PK.

### RLS y políticas

Las cinco tablas tienen `enable row level security`. **No hay políticas para `anon`.** Todas las políticas son `to authenticated`.

Lectura y escritura quedan **solo para staff/admin activos de la misma guardería**. Un padre no ve publicaciones en esta entrega: el feed de familia es otra spec y va a reemplazar estas políticas por unas más específicas (hijos vinculados + anuncios). Esto evita publicar una política "todo el daycare" que después filtre datos de otros niños.

```sql
-- posts
create policy posts_select_staff_admin on public.posts
for select to authenticated
using (
  public.is_active_staff()
  and daycare_id = public.current_daycare_id()
);

create policy posts_insert_staff_admin on public.posts
for insert to authenticated
with check (
  public.is_active_staff()
  and daycare_id = public.current_daycare_id()
  and author_id = (select auth.uid())
);

-- post_children
create policy post_children_select_staff_admin on public.post_children
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_children.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy post_children_insert_staff_admin on public.post_children
for insert to authenticated
with check (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_children.post_id
      and p.daycare_id = public.current_daycare_id()
  )
  and exists (
    select 1
    from public.children c
    join public.rooms r on r.id = c.room_id
    where c.id = post_children.child_id
      and c.status = 'active'
      and r.daycare_id = public.current_daycare_id()
  )
);

-- post_photos
create policy post_photos_select_staff_admin on public.post_photos
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy post_photos_insert_staff_admin on public.post_photos
for insert to authenticated
with check (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

-- reactions (solo esquema por ahora)
create policy reactions_select_staff_admin on public.reactions
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = reactions.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy reactions_insert_staff_admin on public.reactions
for insert to authenticated
with check (
  public.is_active_staff()
  and user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = reactions.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy reactions_delete_own on public.reactions
for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = reactions.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

-- comments (solo esquema por ahora)
create policy comments_select_staff_admin on public.comments
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy comments_insert_staff_admin on public.comments
for insert to authenticated
with check (
  public.is_active_staff()
  and author_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);
```

No se crean políticas `UPDATE` ni `DELETE` para `posts`, `post_photos` ni `comments`: editar y borrar están fuera de alcance.

### Bucket `post-photos`

Bucket **privado**, 5 MB por archivo, solo imágenes. Ruta de objeto:

```
<daycare_id>/<post_id>/<position>.<webp|jpg>
```

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
);

create policy post_photos_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'post-photos'
  and public.is_active_staff()
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
);

create policy post_photos_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'post-photos'
  and public.is_active_staff()
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
);

create policy post_photos_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'post-photos'
  and public.is_active_staff()
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
);
```

- El primer segmento del path es el daycare: la política no depende de joins con el post y bloquea subidas a prefijos ajenos.
- No hay política `UPDATE`: la app no hace `upsert`.
- `storage.foldername(name)` devuelve los directorios con índice 1-based; `[1]` es el daycare.

### Seed de las 3 publicaciones del mockup

Seed idempotente, con UUIDs fijos y `on conflict do nothing`. El autor se resuelve por email (`anibal@gmail.com`), el daycare sale de su perfil y el niño etiquetado es el primer niño activo del daycare (ordenado por `created_at`).

```sql
do $$
declare
  v_author_id uuid;
  v_daycare_id uuid;
  v_child_id uuid;
  v_child_first_name text;
begin
  select u.id, u.daycare_id
    into strict v_author_id, v_daycare_id
  from public.users u
  join auth.users a on a.id = u.id
  where a.email = 'anibal@gmail.com'
    and u.role in ('staff', 'admin')
    and u.status = 'active';

  select c.id, split_part(c.full_name, ' ', 1)
    into v_child_id, v_child_first_name
  from public.children c
  join public.rooms r on r.id = c.room_id
  where r.daycare_id = v_daycare_id
    and c.status = 'active'
  order by c.created_at, c.id
  limit 1;

  insert into public.posts (id, daycare_id, author_id, type, body, published_at)
  values
    (
      'a1111111-1111-4111-8111-111111111111',
      v_daycare_id,
      v_author_id,
      'achievement',
      '¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.',
      now() - interval '2 hours'
    ),
    (
      'a1111111-1111-4111-8111-111111111112',
      v_daycare_id,
      v_author_id,
      'activity',
      format(
        'Pintamos con témperas esta mañana. %s eligió el azul para todo y se concentró un montón mezclando colores.',
        coalesce(v_child_first_name, 'El grupo')
      ),
      now() - interval '6 hours'
    ),
    (
      'a1111111-1111-4111-8111-111111111113',
      v_daycare_id,
      v_author_id,
      'announcement',
      'El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.',
      now() - interval '9 hours'
    )
  on conflict (id) do nothing;

  if v_child_id is not null then
    insert into public.post_children (post_id, child_id)
    values
      ('a1111111-1111-4111-8111-111111111111', v_child_id),
      ('a1111111-1111-4111-8111-111111111112', v_child_id)
    on conflict (post_id, child_id) do nothing;
  end if;
end;
$$;
```

- `select into strict` falla si el staff de prueba no existe: el seed no inventa un autor.
- Si el daycare no tiene niños activos, los dos primeros posts se crean sin `post_children` y la UI los muestra como "toda la sala".
- El tercer post es `announcement` y no etiqueta niños.
- El seed **no** inventa reacciones ni comentarios: los contadores arrancan en `0` y la UI lo refleja.
- `published_at` relativo a `now()` mantiene los tres posts dentro del día en que se aplica la migración.

## Migraciones

1. `create_posts_feed_tables` — enum, funciones auxiliares, función `create_post`, 5 tablas, índices, triggers y políticas RLS.
2. `create_post_photos_bucket` — bucket `post-photos` y políticas de `storage.objects`.
3. `seed_feed_posts` — las 3 publicaciones del mockup.

Cada archivo se crea **después** de aplicar la migración, con la `version` devuelta por el MCP:

```
supabase/migrations/<version>_create_posts_feed_tables.sql
supabase/migrations/<version>_create_post_photos_bucket.sql
supabase/migrations/<version>_seed_feed_posts.sql
```

## Archivos

### Crear

- `supabase/migrations/<version>_create_posts_feed_tables.sql`
- `supabase/migrations/<version>_create_post_photos_bucket.sql`
- `supabase/migrations/<version>_seed_feed_posts.sql`

### Modificar

- `supabase/README.md`
  - Agregar que `posts`, `post_children`, `post_photos`, `reactions` y `comments` tienen RLS con políticas staff/admin (no aparecen en `rls_enabled_no_policy`).
  - Agregar que el bucket `post-photos` es privado, de 5 MB y solo accesible para staff/admin del daycare hasta que exista el feed de padres.
  - No duplicar credenciales ni IDs.

### No se modifican

`app/`, `lib/`, `package.json`, `.env*`, `next.config.ts`, `AGENTS.md`, `specs/spec-11-publicaciones-staff-con-fotos.md` (lo implementa la otra spec).

## Plan de implementación

1. Verificar el estado de partida con `list_migrations`, `list_tables({ schemas: ["public", "storage"] })` y consultas de solo lectura: no existen las 5 tablas, `storage.buckets` está vacío, el daycare y los 2 niños son los esperados. Verificación: los conteos coinciden con esta spec.
2. Aplicar la migración 1 con `apply_migration({ name: "create_posts_feed_tables", query: <SQL> })`. Verificación: devuelve `version` y `list_migrations` incluye el nombre.
3. Crear `supabase/migrations/<version>_create_posts_feed_tables.sql` con el SQL exacto aplicado. Verificación: la `version` coincide con el historial remoto.
4. Verificar el enum con `pg_type` + `pg_enum`. Verificación: `post_type` tiene exactamente `meal`, `nap`, `activity`, `achievement`, `mood`, `photo`, `announcement` en ese orden.
5. Verificar las tablas con `list_tables({ verbose: true })` + `information_schema` + `pg_constraint` + `pg_indexes`. Verificación: columnas, tipos, defaults, PKs, FKs con el `ON DELETE` indicado, CHECKs, UNIQUEs e índices.
6. Verificar las funciones con `pg_proc` (`prosecdef = false`, `proconfig` incluye `search_path=''`) y los triggers con `pg_trigger`. Verificación: `current_daycare_id()`, `is_active_staff()` y `create_post(uuid, public.post_type, text, uuid[], jsonb)` existen; `posts_set_updated_at` y `comments_set_updated_at` están en `BEFORE UPDATE`.
7. Verificar RLS con `pg_class.relrowsecurity` y `pg_policies`. Verificación: RLS activo en las 5 tablas y exactamente las políticas listadas (11 en `public`).
8. Probar el aislamiento con transacciones revertidas (`begin; set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'; …; rollback;`):
   - Staff: `select` devuelve las 3 publicaciones; `insert` de un post propio funciona.
   - Staff de otro daycare (simulado): no ve ni inserta.
   - Padre: `select` devuelve 0 filas; `insert` falla por RLS.
   - `anon`: `select` devuelve 0 filas.
   - RPC `create_post(...)`: con datos válidos (1 niño, 2 fotos y paths `<daycare>/<post_id>/0.webp` y `/1.webp`) devuelve el uuid e inserta 1 fila en `posts`, 1 en `post_children` y 2 en `post_photos`; con 3 fotos, `body` vacío, un `storage_path` fuera del prefijo o un niño de otro daycare falla con el `errcode` esperado y **no deja filas**.
   - `anon` y un padre no pueden ejecutar `create_post` (`42501` / permiso denegado).
   Verificación: sin errores de permisos inesperados y sin filas residuales.
9. Probar los CHECKs: `body = ''`, `body` de 2001 caracteres y `title = '   '` fallan; `position = -1` falla.
10. Aplicar la migración 2 y guardar el archivo. Verificación: `storage.buckets` tiene `post-photos` con `public = false`, `file_size_limit = 5242880` y los 3 MIME; `pg_policies` de `storage.objects` muestra las 3 políticas nuevas.
11. Aplicar la migración 3 y guardar el archivo. Verificación: `posts` tiene 3 filas con los tipos `achievement`, `activity`, `announcement`; `post_children` tiene 2 filas apuntando al primer niño activo; `reactions` y `comments` están vacías.
12. Ejecutar la consulta del feed como staff (join de `posts`, `post_children`, `children`, `author`, conteos de `reactions`/`comments`). Verificación: devuelve 3 filas ordenadas por `published_at desc`.
13. Ejecutar `get_advisors("security")`. Verificación: no aparece `rls_disabled_in_public` para las tablas nuevas; `rls_enabled_no_policy` no aparece para ellas; se documenta cualquier aviso preexistente.
14. Actualizar `supabase/README.md`. Verificación: menciona el bucket privado y el alcance staff-only, sin credenciales.
15. Cierre: `git status` solo muestra `supabase/`; `npm run lint` y `npx tsc --noEmit` sin errores (no hubo cambios de app).

## Checklist de aceptación

Enum y funciones:

- [ ] `public.post_type` existe con exactamente 7 valores, incluido `mood`.
- [ ] `public.current_daycare_id()` y `public.is_active_staff()` existen, son `stable`, `security invoker` y tienen `search_path = ''`.
- [ ] Sin sesión, `current_daycare_id()` devuelve `null` e `is_active_staff()` devuelve `false`.
- [ ] `public.create_post(...)` existe, es `plpgsql`, `security invoker`, tiene `search_path = ''` y solo `authenticated` puede ejecutarla.
- [ ] `create_post` con datos válidos inserta post + niños + fotos de forma atómica; con 3 fotos, body vacío o un path fuera del prefijo `<daycare_id>/<post_id>/` falla sin dejar filas.

Tablas:

- [ ] `posts` existe con 10 columnas: `id`, `daycare_id`, `author_id`, `room_id`, `type`, `title`, `body`, `published_at`, `created_at`, `updated_at`.
- [ ] `posts.daycare_id` es `not null` con FK a `daycares` y `ON DELETE CASCADE`.
- [ ] `posts.author_id` es `not null` con FK a `users` y `ON DELETE CASCADE`.
- [ ] `posts.room_id` es nullable con FK a `rooms` y `ON DELETE SET NULL`.
- [ ] `posts.type` es `public.post_type` y `not null`.
- [ ] `posts.body` es `not null`; los CHECKs rechazan vacío, solo espacios y más de 2000 caracteres.
- [ ] `posts.title` acepta `null` y rechaza solo espacios.
- [ ] `post_children` tiene PK compuesta `(post_id, child_id)` y FKs con `ON DELETE CASCADE`.
- [ ] `post_photos` tiene `storage_path` único, `position >= 0`, UNIQUE `(post_id, position)` y dimensiones positivas cuando no son `null`.
- [ ] `reactions` tiene `type` con CHECK `'love'` y UNIQUE `(post_id, user_id)`.
- [ ] `comments` tiene CHECKs de body no vacío y máximo 1000; `updated_at` lo mantiene un trigger.
- [ ] Existen los 5 índices declarados.
- [ ] `posts_set_updated_at` y `comments_set_updated_at` están en `BEFORE UPDATE`.

Seguridad:

- [ ] RLS está habilitado en `posts`, `post_children`, `post_photos`, `reactions` y `comments`.
- [ ] Las 11 políticas declaradas existen y ninguna aplica a `anon`.
- [ ] Un staff/admin activo del daycare ve las 3 publicaciones y puede insertar un post propio.
- [ ] Un staff/admin de otro daycare no ve ni inserta publicaciones.
- [ ] Un usuario con rol `parent` ve 0 publicaciones e `insert` falla por RLS.
- [ ] Un post insertado con `author_id` distinto de `auth.uid()` falla por RLS.
- [ ] Un `post_children` con un niño de otro daycare falla por RLS.
- [ ] `get_advisors("security")` no reporta `rls_disabled_in_public` ni `rls_enabled_no_policy` para las tablas nuevas.

Storage:

- [ ] El bucket `post-photos` existe, es privado, limita a 5 MB y acepta solo `image/webp`, `image/jpeg`, `image/png`.
- [ ] Un staff/admin puede subir a `<su_daycare_id>/<post_id>/0.webp`.
- [ ] Un staff/admin no puede subir a `<otro_daycare_id>/...`.
- [ ] Un padre no puede subir ni firmar URLs del bucket.
- [ ] Un `anon` no puede leer el bucket.
- [ ] Borrar un objeto propio del daycare funciona; borrar uno de otro daycare falla.

Seed:

- [ ] `posts` tiene exactamente 3 filas con UUIDs `a1111111-1111-4111-8111-111111111111/112/113`.
- [ ] Las 3 filas tienen `daycare_id` del daycare real y `author_id` del staff `anibal@gmail.com`.
- [ ] Los tipos son `achievement`, `activity` y `announcement`; el tercero no tiene `post_children`.
- [ ] `post_children` tiene 2 filas con el primer niño activo del daycare.
- [ ] `reactions` y `comments` están vacías (los contadores arrancan en 0).
- [ ] Una segunda ejecución del bloque no duplica filas (`on conflict do nothing`).

Migraciones:

- [ ] `list_migrations` incluye `create_posts_feed_tables`, `create_post_photos_bucket` y `seed_feed_posts`.
- [ ] Cada `version` coincide con el nombre de su archivo en `supabase/migrations/`.
- [ ] Existen exactamente 3 archivos nuevos y su SQL coincide con lo aplicado.
- [ ] `supabase/README.md` documenta el bucket privado y el alcance staff-only sin credenciales.
- [ ] `npm run lint` y `npx tsc --noEmit` terminan sin errores (no hubo cambios de app).

## Decisiones

- **Sí:** `posts.daycare_id NOT NULL` aunque el diccionario no lo tenga. Es el eje del aislamiento multi-tenant y evita que la audiencia "toda la sala" dependa del daycare del autor.
- **Sí:** `mood` en `post_type`. La UI ya tiene 7 chips (SPEC-06) y quitar Ánimo sería una regresión visual.
- **Sí:** `room_id` nullable y sin uso en esta entrega. Se conserva para publicaciones por sala sin una migración futura, pero "Toda la sala" hoy significa todo el daycare.
- **Sí:** `post_photos.storage_path` en lugar de `url`. Las signed URLs expiran; el path es estable y permite regenerarlas.
- **Sí:** `alt`, `width` y `height` en `post_photos`. Accesibilidad y layout estable sin saltos.
- **Sí:** `reactions` y `comments` se crean ahora (decisión del usuario) aunque la UI llegue después. Los contadores del feed ya salen de la DB.
- **Sí:** RLS staff-only en las 5 tablas y en Storage. El feed de padres todavía no existe; una política "todo el daycare" filtraría publicaciones de otros niños.
- **Sí:** funciones `current_daycare_id()` e `is_active_staff()` en vez de repetir subqueries en 11 políticas. Menos duplicación y un único lugar para auditar el aislamiento.
- **Sí:** RPC `create_post` para crear el post, sus etiquetas y sus fotos en una sola transacción. PostgREST no anida inserciones one-to-many, y tres inserts sueltos dejarían posts huérfanos que el cliente no puede borrar (no hay `DELETE`). La función es `security invoker`, así que RLS sigue siendo la última palabra.
- **Sí:** el path de cada foto se valida contra `<daycare_id>/<post_id>/` dentro del RPC. Evita registrar en `post_photos` objetos de otro post o de otro tenant.
- **No:** tres inserts secuenciales desde la Server Action con limpieza compensatoria. Exigiría una política `DELETE` sobre `posts` solo para rollback y aun así podría dejar basura si el cleanup falla.
- **Sí:** bucket privado con path `<daycare_id>/<post_id>/<position>`. La política se resuelve con `storage.foldername(name)[1]`, sin joins.
- **Sí:** límite de 2 fotos en la Server Action y en el RPC. Un CHECK no puede contar filas hermanas y no se agrega un trigger por una regla de producto.
- **Sí:** seed con el primer niño activo y texto adaptado con `format()`. Mantiene el feed poblado sin inventar niños que no existen.
- **Sí:** seed sin fotos ni reacciones. No se pueden subir binarios desde una migración y falsear contadores ensucia los datos.
- **No:** políticas para padres. Van con la spec del feed de familia, que define exactamente qué ve cada tutor.
- **No:** políticas `UPDATE`/`DELETE` en `posts`. Editar y borrar están fuera de alcance.
- **No:** trigger que limite a 2 fotos. Regla de producto, no de integridad.
- **No:** `storage.objects` público. Son imágenes de menores.
- **No:** realtime ni notificaciones. `notify_on_post` queda para cuando exista el envío.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las políticas repiten subqueries y pueden volverse lentas con muchos posts. | Los índices `posts_daycare_id_published_at_idx` y `post_children_child_id_idx` cubren los filtros; las funciones son `stable` y se evalúan una vez por consulta. |
| El RPC concentra toda la escritura: un error de permisos o de `search_path` dejaría el feed sin publicaciones nuevas. | Es `security invoker` con `search_path = ''`; `EXECUTE` queda revocado de `public`/`anon` y el plan prueba staff, padre y `anon` dentro de transacciones revertidas. |
| Si la subida a Storage funciona y el RPC falla, quedan objetos huérfanos. | La Server Action borra los objetos ya subidos cuando `create_post` falla (`storage.remove`, best-effort). La limpieza automática de huérfanos queda fuera de alcance y documentada. |
| `storage.objects` sin política de `UPDATE` rompe un futuro `upsert`. | La app sube con `upsert: false` y usa paths únicos por `post_id`; si se necesita reemplazo, se agrega en otra migración. |
| El seed falla si no existe `anibal@gmail.com` o el daycare. | `select into strict` falla ruidosamente; es preferible a sembrar datos huérfanos. Se documenta en el plan. |
| El seed etiqueta al "primer niño activo", que puede cambiar entre entornos. | Es un seed de desarrollo; la verificación comprueba que el niño exista y pertenezca al daycare. |
| Borrar un `children` borra sus `post_children` y deja el post como "toda la sala". | Es el comportamiento esperado del CASCADE; el post conserva su texto y su audiencia se vuelve general. |
| Un staff de otro daycare con el mismo `daycare_id` mal configurado vería todo. | El daycare del usuario es `NOT NULL` y las políticas lo comparan en cada operación; se prueba con un usuario simulado de otro tenant. |
| El advisor reporta funciones `security definer` o search path. | Las tres funciones son `security invoker` con `search_path = ''`; se verifica con `pg_proc`. |
| Los paths de Storage podrían colisionar entre posts. | El path incluye `post_id` (UUID) y `position`; `storage_path` además es UNIQUE. |
| `mood` no existe en el diccionario y confunde a futuros consumidores. | Se documenta en esta spec y en el catálogo de `lib/posts.ts`; el diccionario se actualiza cuando se revise. |

## Qué **no** está en este spec

- Políticas de lectura para padres, feed de familia y filtros por hijo.
- Editar, borrar o archivar publicaciones.
- UI de reacciones y comentarios.
- Notificaciones (`notify_on_post`) y resumen diario.
- Publicaciones programadas, borradores o `published_at` futuro.
- Selección de sala (`room_id`) desde la UI.
- Realtime para el feed.
- Limpieza automática de objetos huérfanos en Storage.
- Tipos TypeScript generados desde el esquema.
- Cambios en `app/`, `lib/` o `next.config.ts` (los hace la spec UI).
