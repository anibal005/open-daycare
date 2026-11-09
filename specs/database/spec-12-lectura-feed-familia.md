# SPEC-12 (database) — Lectura del feed para familias

| Campo           | Valor                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Feature**     | Políticas RLS de lectura para el feed familiar: publicaciones visibles, vínculos propios, fotos, niños, autor y contadores     |
| **Estado**      | `Approved`                                                                                                                   |
| **Fecha**       | `2026-11-06`                                                                                                                 |
| **Depends on**  | SPEC-07 (`daycares`), SPEC-08 (`users`), SPEC-10 database (`rooms`, `children`, `parent_children`), SPEC-11 database (`posts`, `post_children`, `post_photos`, `reactions`, `comments`, bucket `post-photos`) |
| **Fuente**      | `openspec/changes/split-staff-family-panels/design.md` (D5) y `specs/family-feed/spec.md`                                     |
| **Spec UI**     | `openspec/changes/split-staff-family-panels/specs/family-feed/spec.md`                                                        |

## Descripción

Agregar la capa de lectura que necesita un padre para ver su feed sin abrir el daycare entero. Hoy las cinco tablas del feed (`posts`, `post_children`, `post_photos`, `reactions`, `comments`), el bucket `post-photos` y `children` son **solo para staff/admin**; `users` solo permite leer la fila propia y `parent_children` ya deja al padre ver sus vínculos. Este spec define **cinco helpers `security definer`** y **ocho políticas `SELECT` aditivas** para que un padre activo vea únicamente:

- publicaciones de su guardería dirigidas a toda la sala o a un hijo con vínculo activo;
- los vínculos `post_children` de sus propios hijos dentro de esas publicaciones;
- las fotos de esas publicaciones y sus objetos de Storage;
- el nombre y la sala de sus hijos vinculados;
- el nombre, avatar y rol del staff autor de la guardería.

No se toca `INSERT`, `UPDATE` ni `DELETE`, no se agregan columnas, enums ni tablas, y las políticas del staff no se modifican. El cambio es compatible hacia atrás: antes de desplegar la app nueva el staff sigue funcionando igual.

**Alcance:**

- ✅ Helpers `is_active_parent()`, `is_parent_of_child(uuid)`, `can_view_family_post(uuid)`, `can_view_post_photo(text)` y `can_view_staff_member(uuid)`.
- ✅ Grants explícitos: `revoke execute from public, anon` y `grant execute to authenticated`.
- ✅ Ocho políticas `for select to authenticated`: `posts`, `post_children`, `post_photos`, `children`, `users`, `reactions`, `comments` y `storage.objects` (`post-photos`).
- ✅ Matriz de acceso tabla × comando × rol.
- ✅ Probes de aislamiento con la sesión del padre, incluyendo cross-family y cross-daycare en transacciones con `rollback`.
- ✅ Verificación de `pg_proc`, `pg_policies`, grants y `get_advisors`.
- ❌ Reacciones o comentarios creados por padres (`INSERT`/`DELETE` siguen solo para staff).
- ❌ Edición de publicaciones, fotos o vínculos.
- ❌ Políticas para `daycares` o para el nombre de la guardería en el sidebar familiar.
- ❌ RPC de feed, `service_role` en la app, realtime o notificaciones.
- ❌ Cambios de esquema, seeds, columnas, enums o índices.
- ❌ Código de app (lo implementa el change `split-staff-family-panels`).

## Reglas globales

- Nombres de funciones, políticas y columnas en **inglés**; etiquetas de UI en español.
- Todo el DDL entra por `apply_migration` del MCP. Nunca por dashboard, `execute_sql` ni `psql`.
- Un archivo por migración, con la `version` que devuelve `apply_migration`. La `version` no se inventa.
- Las migraciones aplicadas no se editan. Cualquier ajuste es un archivo nuevo; no hay migraciones `down`.
- `execute_sql` queda reservado para verificación de solo lectura y para los probes dentro de transacciones con `rollback`.
- El repo es la fuente de verdad del esquema.
- `service_role` (MCP) sigue operando sin RLS; la app usa la publishable key y respeta las políticas.

## Estado de partida (verificado el 2026-11-06)

- Migraciones aplicadas: 15; la última es `20261104151835_seed_feed_posts`.
- `public.daycares`: 1 fila (`Guardería Sala Soles`, `e4045cb8-f59a-48a6-843d-73c0e1097974`).
- `public.users`: 2 filas.
  - Staff: `anibal@gmail.com` (`Anibal Delgado`, `11111111-1111-4111-8111-111111111111`, `role = staff`, `status = active`).
  - Padre de prueba: `anibaldel005@gmail.com` (`anibal delgado mendoza`, `15c36cf4-7a99-47b9-ace2-3366d80532b9`, `role = parent`, `status = active`).
- `public.children`: `Thiago Cuadros` (`04519f2e-f3c5-4997-97ca-17419f7251b8`, Sala Soles) y `Celeste Delgado` (`22696276-16d4-432c-88d1-3128dbea3577`, Sala Estrellas), ambas activas.
- `public.parent_children`: 1 vínculo activo (`father`) entre el padre de prueba y Thiago. **No** hay vínculo con Celeste: sirve como "otra familia" dentro de la misma guardería.
- `public.posts`: 10 filas. Hay publicaciones dirigidas a Thiago, a Celeste, a ambos y anuncios sin destinatarios.
- `public.post_children`: 9 filas.
- `public.post_photos`: 6 filas. Hay fotos en posts visibles (`c8f49f56-…`, `cedfab6a-…`, `73b8adea-…`) y en un post de Celeste (`bb0ed02d-…`), que debe quedar fuera del alcance del padre.
- `public.reactions` y `public.comments`: 0 filas.
- Bucket `post-photos`: privado, con políticas solo para staff/admin.
- Helpers existentes: `public.current_daycare_id()` y `public.is_active_staff()` (`security invoker`, `stable`, `search_path = ''`).
- `rooms` ya tiene `rooms_select_same_daycare`, así que el embed `rooms(name)` funciona para el padre sin política nueva.
- `posts.room_id` es nullable y `create_post` no lo setea: la audiencia real vive en `post_children`. Un post sin filas en `post_children` significa "toda la sala".

## Modelo de seguridad

### Helpers

Todos son `language sql`, `stable`, `security definer`, `set search_path = ''`. `security definer` es obligatorio en los que cruzan tablas: si fueran `invoker`, la evaluación de la política volvería a aplicar RLS sobre `posts`, `post_children`, `children`, `rooms`, `users` o `post_photos` y produciría recursión o resultados vacíos. `search_path = ''` con nombres calificados evita hijacking; `auth.uid()` va calificado.

```sql
create function public.is_active_parent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role = 'parent'
  );
$$;

create function public.is_parent_of_child(child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_children pc
    join public.children c on c.id = pc.child_id
    join public.rooms r on r.id = c.room_id
    join public.users u on u.id = pc.user_id
    where pc.user_id = (select auth.uid())
      and pc.child_id = $1
      and pc.status = 'active'
      and c.status = 'active'
      and u.status = 'active'
      and u.role = 'parent'
      and r.daycare_id = u.daycare_id
  );
$$;

create function public.can_view_family_post(post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    join public.users u on u.id = (select auth.uid())
    where p.id = $1
      and p.daycare_id = u.daycare_id
      and u.status = 'active'
      and u.role = 'parent'
      and (
        not exists (
          select 1
          from public.post_children pc
          where pc.post_id = p.id
        )
        or exists (
          select 1
          from public.post_children pc
          where pc.post_id = p.id
            and public.is_parent_of_child(pc.child_id)
        )
      )
  );
$$;

create function public.can_view_post_photo(storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_parent()
    and exists (
      select 1
      from public.post_photos pp
      where pp.storage_path = $1
        and public.can_view_family_post(pp.post_id)
    );
$$;

create function public.can_view_staff_member(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users me
    join public.users target on target.id = $1
    where me.id = (select auth.uid())
      and me.status = 'active'
      and target.status = 'active'
      and target.role in ('staff', 'admin')
      and target.daycare_id = me.daycare_id
  );
$$;

revoke execute on function public.is_active_parent() from public, anon;
revoke execute on function public.is_parent_of_child(uuid) from public, anon;
revoke execute on function public.can_view_family_post(uuid) from public, anon;
revoke execute on function public.can_view_post_photo(text) from public, anon;
revoke execute on function public.can_view_staff_member(uuid) from public, anon;

grant execute on function public.is_active_parent() to authenticated;
grant execute on function public.is_parent_of_child(uuid) to authenticated;
grant execute on function public.can_view_family_post(uuid) to authenticated;
grant execute on function public.can_view_post_photo(text) to authenticated;
grant execute on function public.can_view_staff_member(uuid) to authenticated;
```

| Helper | Devuelve |
| --- | --- |
| `is_active_parent()` | el caller autenticado es `parent` con `status = 'active'` |
| `is_parent_of_child(child_id)` | existe vínculo `parent_children` activo entre el caller y ese niño activo, del mismo daycare que el caller |
| `can_view_family_post(post_id)` | el caller es parent activo, el post es de su daycare y (no tiene destinatarios **o** incluye un hijo suyo con vínculo activo) |
| `can_view_post_photo(storage_path)` | esa ruta pertenece a `post_photos` de un post que cumple `can_view_family_post` |
| `can_view_staff_member(user_id)` | el objetivo es `staff`/`admin` activo del mismo daycare que el caller activo |

Notas:

- `is_active_parent` e `is_parent_of_child` solo exponen booleanos sobre el caller y no filtran datos.
- `is_parent_of_child` exige `c.status = 'active'`: un niño archivado deja de dar visibilidad.
- `can_view_family_post` compara `p.daycare_id` con el daycare del caller (no con el del autor), así que mover a un usuario de tenant no cambia la audiencia de un post.
- `can_view_post_photo` no valida el prefijo `<daycare_id>/`, sino la ruta exacta contra `post_photos` de un post visible. `post_photos.storage_path` es UNIQUE, así que el lookup es barato.
- `can_view_staff_member` no depende del rol del caller: cualquier usuario activo del daycare puede leer a sus `staff`/`admin`; el `WHERE` de las policies del feed limita el uso al caso del autor.
- Sin sesión, `auth.uid()` es `null` y todos los helpers devuelven `false`.

### Políticas nuevas

Todas son `for select to authenticated` y **aditivas** (se combinan con `OR` respecto de las políticas del staff).

```sql
create policy posts_select_family_parent on public.posts
for select to authenticated
using (public.can_view_family_post(id));

create policy post_children_select_family_parent on public.post_children
for select to authenticated
using (
  public.can_view_family_post(post_id)
  and public.is_parent_of_child(child_id)
);

create policy post_photos_select_family_parent on public.post_photos
for select to authenticated
using (public.can_view_family_post(post_id));

create policy children_select_family_parent on public.children
for select to authenticated
using (
  public.is_active_parent()
  and public.is_parent_of_child(id)
);

create policy users_select_staff_member on public.users
for select to authenticated
using (public.can_view_staff_member(id));

create policy reactions_select_family_parent on public.reactions
for select to authenticated
using (public.can_view_family_post(post_id));

create policy comments_select_family_parent on public.comments
for select to authenticated
using (public.can_view_family_post(post_id));

create policy post_photos_storage_select_family_parent on storage.objects
for select to authenticated
using (
  bucket_id = 'post-photos'
  and public.can_view_post_photo(name)
);
```

Notas:

- La política de `post_children` es la que garantiza que el padre vea solo los nombres de sus hijos en un post compartido: `is_parent_of_child(child_id)` descarta los vínculos de otros niños.
- La política de `children` permite leer nombre, sala y notas del propio hijo, pero no el resto del daycare.
- `daycares` no necesita política: el sidebar familiar dice "Familia" y el feed no muestra el nombre de la guardería.
- `reactions` y `comments` solo ganan `SELECT`; el padre no puede insertar ni borrar. Los contadores son de solo lectura y los calcula PostgREST con `count`.
- Las políticas del staff no se modifican y siguen siendo la única vía de escritura.
- La política de Storage se suma a `post_photos_storage_select` (staff). No da acceso al bucket entero: cada ruta se valida contra `post_photos` de un post visible.

### Matriz de acceso tabla × comando × rol

`✅` = permitido por alguna política; `❌` = denegado por RLS; `—` = no aplica / sin política (denegado por defecto).

| Tabla / objeto | Comando | `anon` | `parent` activo | `staff` / `admin` activo | Detalle |
| --- | --- | --- | --- | --- | --- |
| `posts` | `SELECT` | ❌ | ✅ solo visibles | ✅ todo el daycare | Padre: `can_view_family_post(id)`. Staff: `posts_select_staff_admin`. |
| `posts` | `INSERT` | ❌ | ❌ | ✅ | Solo staff/admin; sin cambios. |
| `posts` | `UPDATE` / `DELETE` | ❌ | ❌ | ❌ | Sin políticas; fuera de alcance. |
| `post_children` | `SELECT` | ❌ | ✅ solo sus hijos en posts visibles | ✅ todo el daycare | Padre: `can_view_family_post(post_id) and is_parent_of_child(child_id)`. |
| `post_children` | `INSERT` | ❌ | ❌ | ✅ | Solo staff/admin; sin cambios. |
| `post_photos` | `SELECT` | ❌ | ✅ fotos de posts visibles | ✅ todo el daycare | Padre: `can_view_family_post(post_id)`. |
| `post_photos` | `INSERT` | ❌ | ❌ | ✅ | Solo staff/admin; sin cambios. |
| `children` | `SELECT` | ❌ | ✅ solo sus hijos vinculados | ✅ todo el daycare | Padre: `is_active_parent() and is_parent_of_child(id)`. |
| `children` | `INSERT` | ❌ | ❌ | ✅ | Solo staff/admin; sin cambios. |
| `users` | `SELECT` | ❌ | ✅ fila propia + staff/admin del daycare | ✅ fila propia + staff/admin del daycare | Padre: `users_select_self` **o** `can_view_staff_member(id)`. No puede leer otros padres. |
| `users` | `UPDATE` / `DELETE` | ❌ | ❌ | ❌ | Sin políticas. |
| `reactions` | `SELECT` | ❌ | ✅ de posts visibles | ✅ todo el daycare | Padre: `can_view_family_post(post_id)`. |
| `reactions` | `INSERT` / `DELETE` | ❌ | ❌ | ✅ | Sin cambios: solo staff/admin. |
| `comments` | `SELECT` | ❌ | ✅ de posts visibles | ✅ todo el daycare | Padre: `can_view_family_post(post_id)`. |
| `comments` | `INSERT` | ❌ | ❌ | ✅ | Sin cambios: solo staff/admin. |
| `parent_children` | `SELECT` | ❌ | ✅ sus propios vínculos | ✅ todo el daycare | Sin cambios (políticas de SPEC-10). |
| `rooms` | `SELECT` | ❌ | ✅ su daycare | ✅ su daycare | Sin cambios (`rooms_select_same_daycare`). |
| `storage.objects` (`post-photos`) | `SELECT` | ❌ | ✅ rutas de posts visibles | ✅ prefijo del daycare | Padre: `can_view_post_photo(name)`. |
| `storage.objects` (`post-photos`) | `INSERT` / `DELETE` | ❌ | ❌ | ✅ prefijo del daycare | Sin cambios. |
| `daycares` | `SELECT` | ❌ | ❌ | ❌ | Sin política (deny por defecto). Aviso esperado. |

## Probes de aislamiento

Se ejecutan con `execute_sql` en transacciones que **siempre terminan en `rollback`** y no dejan filas. La sesión del padre se simula con:

```sql
begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"15c36cf4-7a99-47b9-ace2-3366d80532b9","role":"authenticated"}';
-- probes
rollback;
```

### Datos de referencia

- Padre de prueba: `15c36cf4-7a99-47b9-ace2-3366d80532b9` (vinculado a Thiago).
- Thiago: `04519f2e-f3c5-4997-97ca-17419f7251b8`.
- Celeste (otra familia, mismo daycare): `22696276-16d4-432c-88d1-3128dbea3577`.
- Post de Thiago: `cedfab6a-9a7d-4fa1-b31a-14f7ecaf5f46`.
- Post de Celeste: `bb0ed02d-69ed-400c-a702-f4ab9447d019`.
- Post compartido Thiago + Celeste: `c8f49f56-57c8-4749-a8b8-4a9c25bb2926`.
- Anuncio sin destinatarios: `81675678-3cf2-4b7a-b2c0-8f073c8de80a`.
- Foto visible: `e4045cb8-…/cedfab6a-…/0.webp`.
- Foto ajena: `e4045cb8-…/bb0ed02d-…/0.webp`.

### Probes

| # | Probe | SQL (con la sesión del padre) | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Post de su hijo visible | `select count(*) from public.posts where id = 'cedfab6a-…';` | `1` |
| 2 | Post de otra familia oculto | `select count(*) from public.posts where id = 'bb0ed02d-…';` | `0` |
| 3 | Post de otra guardería oculto | Insertar en la misma transacción (antes de cambiar de rol) un `daycares` + `posts` de otro tenant; luego `select count(*) from public.posts where daycare_id = '<otro>';` | `0` |
| 4 | Anuncio sin destinatarios visible | `select count(*) from public.posts where id = '81675678-…';` | `1` |
| 5 | `post_children` solo con sus hijos | `select child_id from public.post_children where post_id = 'c8f49f56-…';` | Solo `04519f2e-…` (Thiago), nunca `22696276-…` (Celeste) |
| 6 | `children` solo su hijo | `select id from public.children order by id;` | Solo `04519f2e-…` |
| 7 | Autor staff legible | `select full_name from public.users where id = '11111111-…';` | `Anibal Delgado` |
| 8 | Autor de otra guardería ilegible | Insertar en la misma transacción (antes del cambio de rol) un `users` de otro daycare; luego `select count(*) from public.users where id = '<otro>';` | `0` |
| 9 | Ruta de Storage de post visible firmable | `select public.can_view_post_photo('e4045cb8-…/cedfab6a-…/0.webp');` | `true` |
| 10 | Ruta de Storage de post ajeno rechazada | `select public.can_view_post_photo('e4045cb8-…/bb0ed02d-…/0.webp');` | `false` |
| 11 | `INSERT` en `reactions` rechazado | `insert into public.reactions (post_id, user_id) values ('cedfab6a-…', '15c36cf4-…');` | Error `42501` (RLS) |
| 12 | `INSERT` en `comments` rechazado | `insert into public.comments (post_id, author_id, body) values ('cedfab6a-…', '15c36cf4-…', 'probe');` | Error `42501` (RLS) |
| 13 | `anon` no ve nada | Repetir con `set local role anon` y sin claims: `select count(*) from public.posts;` y `select public.is_active_parent();` | `0` y permiso denegado (helper revocado) |

Para los probes 3 y 8, el setup se hace en la misma transacción con el rol del MCP (`postgres`), y luego se cambia a `authenticated`. Como la transacción termina en `rollback`, no quedan datos de prueba.

### Verificación de grants

```sql
select
  p.proname,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_active_parent',
    'is_parent_of_child',
    'can_view_family_post',
    'can_view_post_photo',
    'can_view_staff_member'
  )
order by p.proname;
```

Resultado esperado: `anon_execute = false` y `authenticated_execute = true` para las cinco.

## Migración

Una sola migración versionada:

```
supabase/migrations/<version>_add_family_feed_read_policies.sql
```

Contenido, en este orden:

1. Los 5 helpers con `security definer`, `stable` y `search_path = ''`.
2. `revoke execute` de `public, anon` y `grant execute` a `authenticated`.
3. Las 8 políticas `SELECT` (7 en `public`, 1 en `storage.objects`).

Sin seeds, sin columnas, sin enums, sin índices y sin cambios a las políticas del staff.

## Plan de implementación

1. Verificar el estado de partida con `list_migrations` y consultas de solo lectura: existen las 5 tablas, el bucket y los datos de referencia; no existen los 5 helpers ni las 8 políticas. Verificación: los conteos coinciden con esta spec.
2. Aplicar la migración con `apply_migration({ name: "add_family_feed_read_policies", query: <SQL> })`. Verificación: devuelve `version` y `list_migrations` incluye el nombre.
3. Crear `supabase/migrations/<version>_add_family_feed_read_policies.sql` con el SQL exacto aplicado. Verificación: la `version` coincide con el historial remoto.
4. Verificar las funciones con `pg_proc`: las 5 existen, son `stable`, tienen `prosecdef = true` y `proconfig` incluye `search_path=""`.
5. Verificar las políticas con `pg_policies`: las 8 nuevas existen, son `SELECT` y son `to authenticated`.
6. Verificar los grants con `has_function_privilege`. Verificación: `anon = false`, `authenticated = true`.
7. Ejecutar los 13 probes de aislamiento. Verificación: cada uno devuelve lo esperado y la transacción termina en `rollback` sin filas residuales.
8. Ejecutar `get_advisors("security")` y `@db-security-auditor`. Verificación: no aparecen hallazgos Críticos/Altos nuevos; `rls_enabled_no_policy` de `public.daycares` se documenta como aviso esperado.
9. Actualizar `supabase/README.md` con el alcance de lectura familiar y el aviso esperado. Verificación: no duplica credenciales ni IDs.

## Archivos

### Crear

- `supabase/migrations/<version>_add_family_feed_read_policies.sql`
- `specs/database/spec-12-lectura-feed-familia.md` (este archivo)

### Modificar

- `supabase/README.md`
  - Documentar que el feed familiar agrega políticas `SELECT` para padres activos y que Storage sigue siendo privado.
  - Mantener el aviso esperado de `rls_enabled_no_policy` en `public.daycares`.

### No se modifican

`app/`, `lib/`, `package.json`, `.env*`, `next.config.ts`, `AGENTS.md`, el bucket ni las políticas del staff.

## Checklist de aceptación

Helpers:

- [ ] `is_active_parent()`, `is_parent_of_child(uuid)`, `can_view_family_post(uuid)`, `can_view_post_photo(text)` y `can_view_staff_member(uuid)` existen.
- [ ] Los 5 helpers son `stable`, `security definer` (`prosecdef = true`) y tienen `search_path = ''` (`proconfig`).
- [ ] `anon` no puede ejecutar los helpers; `authenticated` sí.
- [ ] Sin sesión, los helpers que dependen `auth.uid()` devuelven `false`.
- [ ] `is_parent_of_child` devuelve `false` para un niño archivado o para un vínculo inactivo.

Políticas:

- [ ] `posts_select_family_parent` existe y usa `can_view_family_post(id)`.
- [ ] `post_children_select_family_parent` existe y usa `can_view_family_post(post_id) and is_parent_of_child(child_id)`.
- [ ] `post_photos_select_family_parent` existe y usa `can_view_family_post(post_id)`.
- [ ] `children_select_family_parent` existe y usa `is_active_parent() and is_parent_of_child(id)`.
- [ ] `users_select_staff_member` existe y usa `can_view_staff_member(id)`.
- [ ] `reactions_select_family_parent` y `comments_select_family_parent` existen y usan `can_view_family_post(post_id)`.
- [ ] `post_photos_storage_select_family_parent` existe en `storage.objects` con `bucket_id = 'post-photos' and can_view_post_photo(name)`.
- [ ] Ninguna política nueva aplica a `anon` ni habilita `INSERT`/`UPDATE`/`DELETE`.

Aislamiento:

- [ ] Con la sesión del padre, el post de Thiago y el anuncio se ven; el post de Celeste no.
- [ ] Un post de otra guardería no se ve desde la sesión del padre.
- [ ] `post_children` de un post compartido devuelve solo el vínculo de Thiago.
- [ ] `children` devuelve solo Thiago.
- [ ] El autor staff es legible; un usuario de otra guardería no.
- [ ] `can_view_post_photo` devuelve `true` para una foto de post visible y `false` para una de post ajeno.
- [ ] `INSERT` en `reactions` y `comments` con la sesión del padre falla con `42501`.
- [ ] Cada probe termina en `rollback` sin dejar filas.

Migración y advisors:

- [ ] `list_migrations` incluye `add_family_feed_read_policies`.
- [ ] La `version` del archivo coincide con el historial remoto.
- [ ] `get_advisors("security")` no reporta hallazgos Críticos/Altos nuevos.
- [ ] `rls_enabled_no_policy` de `public.daycares` se documenta como aviso esperado.
- [ ] `supabase/README.md` documenta el alcance familiar sin credenciales.

## Decisiones

- **Sí:** helpers `security definer` para los cinco casos. Los que cruzan tablas producen recursión si son `invoker`; los otros dos mantienen un único punto de auditoría.
- **Sí:** `search_path = ''` y nombres calificados. Evita hijacking y el advisor de search path mutable.
- **Sí:** políticas aditivas en vez de reemplazar las del staff. El despliegue es compatible hacia atrás y no hay que recrear las políticas de escritura.
- **Sí:** `post_children` exige `is_parent_of_child(child_id)` además de `can_view_family_post(post_id)`. Sin eso, un post compartido filtraría los nombres de niños de otras familias.
- **Sí:** `users_select_staff_member` limita a `staff`/`admin` del mismo daycare. El padre no gana acceso a otros padres.
- **Sí:** `can_view_post_photo` valida la ruta exacta contra `post_photos` de un post visible, no el prefijo del daycare. El prefijo solo diría "mismo tenant", no "post visible".
- **Sí:** `children` solo para el propio hijo. La política del staff sigue cubriendo la gestión de todos los niños.
- **No:** política sobre `daycares`. El feed familiar no muestra el nombre de la guardería.
- **No:** `INSERT`/`DELETE` para reacciones o comentarios de padres. Queda fuera de alcance y se agrega en otra migración si se retoma.
- **No:** RPC `get_family_feed`. PostgREST + RLS expresa la consulta y mantiene una sola fuente de verdad.
- **No:** `service_role` en la app. La publishable key respeta RLS.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Recursión de RLS o fuga entre familias por helpers mal diseñados | `security definer` + `search_path = ''`; probes impersonando al padre real y a un padre sin vínculo; auditoría con `@db-security-auditor`. |
| Un post visible filtra nombres de otros niños vía `post_children` | La política exige `is_parent_of_child(child_id)` además de `can_view_family_post(post_id)`. |
| Una foto de otro post se puede firmar | `can_view_post_photo` valida la ruta exacta contra `post_photos` de un post visible. |
| Los helpers `security definer` quedan ejecutables por `anon` | `revoke execute from public, anon` + `grant execute to authenticated`; se verifica con `has_function_privilege`. |
| Un niño archivado sigue dando visibilidad | `is_parent_of_child` exige `c.status = 'active'` y `pc.status = 'active'`. |
| El advisor reporta funciones `security definer` o search path | Las cinco tienen `search_path = ''`; se verifica con `pg_proc`. |
| Las políticas aditivas conceden de más al staff | Las políticas nuevas son `parent`-only por sus helpers; las del staff no se tocan. |
| Consultas del feed más lentas con muchos posts | `posts_daycare_id_published_at_idx`, `post_children_child_id_idx`, `post_photos_storage_path_key` y las funciones `stable` cubren el caso. |

## Qué **no** está en este spec

- La app, los layouts, los guards, el feed y los sidebars familiares.
- Reacciones, comentarios, notificaciones, avisos y "Resumen del día".
- Edición o borrado de publicaciones y fotos.
- Política de lectura de `daycares` o del nombre de la guardería.
- RPCs de feed, realtime o tipos TypeScript generados.
- Cambios de esquema, columnas, enums, índices o seeds.
