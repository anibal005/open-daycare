# Design

## Context

Ver `proposal.md` para la motivación. El estado actual que condiciona el diseño:

- Un único shell (`app/page.tsx`, `app/kid/**`) con un `Sidebar` que decide en el cliente si muestra "Niños" leyendo `users.role`. No hay guard por rol: `proxy.ts` solo valida sesión.
- `login` hace `router.push("/")`; `/` es el feed del staff.
- RLS es staff-only en `posts`, `post_children`, `post_photos`, `reactions`, `comments`, `children` y en el bucket `post-photos`. `users` solo permite leer la fila propia. `parent_children` ya permite al padre leer sus vínculos y `rooms` ya es legible por cualquier usuario del mismo daycare.
- Helpers existentes: `public.current_daycare_id()` y `public.is_active_staff()` (`security invoker`, `stable`, `search_path = ''`).
- `posts.room_id` es nullable y `create_post` no lo setea: la audience real vive en `post_children`. Un post sin filas en `post_children` significa "toda la sala".
- Next.js 16 con `cacheComponents: true`: un layout que lee `cookies()` no puede prerenderizarse y necesita una decisión explícita (`instant = false`) o un `<Suspense>`.

## Goals / Non-Goals

**Goals:**

- Un límite de área explícito y verificable: `/staff/**` solo staff/admin, `/family/**` solo parents, `/` como resolver.
- Que el feed familiar lea datos reales sin abrir el daycare entero: visibilidad por post, vínculos propios, fotos de posts visibles y nombre del autor.
- Reutilizar el patrón de datos actual (Server Components + `createClient()` + RLS) sin introducir RPCs de feed ni `service_role`.
- Que la seguridad no dependa de la UI: aunque alguien fuerce una navegación, RLS y los server actions siguen siendo la última barrera.

**Non-Goals:**

- "Resumen del día", "Mi cuenta" familiar editable, avisos y reacciones/comentarios de padres.
- Ruta de detalle de publicación, lightbox de fotos o notificaciones (los mockups tienen links, pero no hay pantalla en este cambio).
- Cambiar el modelo de datos: no hay columnas, enums ni tablas nuevas.
- Reemplazar la autenticación ni mover la validación de sesión fuera de `proxy.ts`.

## Decisions

### D1 — Rutas simétricas `/staff` y `/family`

```
/login --> router -> "/" (resolver de rol)
                        |
        +---------------+----------------+
        |                                |
   staff/admin                       parent
        v                                v
/staff  (feed)                     /family (feed familiar)
/staff/children
/staff/children/[id]
```

`app/staff/page.tsx` es el feed actual; `app/staff/children/**` reemplaza `app/kid/**`. `/kid` deja de existir sin redirect (el proposal ya lo marca como **BREAKING**). `/` pasa a ser un resolver puro: lee el perfil y redirige.

**Por qué:** guards por prefijo, simetría entre áreas y ninguna ruta "neutral" que renderice datos de un área. Alternativas descartadas: staff en `/` (guards asimétricos y `/` con dos significados) y render condicional en la misma URL (autorización borrosa, pantallas divergentes).

### D2 — Guards en layouts de área, no en el proxy

`proxy.ts` sigue haciendo solo `updateSession()` (sesión + refresh de cookies). Cada layout de área resuelve el perfil y aplica su guard:

| Layout | Perfil válido | Si no |
|---|---|---|
| `app/staff/layout.tsx` | `active` + `staff`/`admin` | `parent` → `/family`; sin perfil/inactivo → `/access-denied` |
| `app/family/layout.tsx` | `active` + `parent` | `staff`/`admin` → `/staff`; sin perfil/inactivo → `/access-denied` |
| `app/access-denied/page.tsx` | cualquier sesión | sin sesión → `/login` |

**Por qué:** el proxy corre en el borde en cada request y no debe consultar la base; el layout ya corre en el servidor con el cliente de Supabase y es el lugar natural para resolver el área. Además, un layout nunca es la única defensa: RLS filtra filas y los server actions (`create-post`, `invite-parent`) ya validan rol.

**Trade-off aceptado:** los layouts no se re-ejecutan en cada navegación cliente dentro del mismo segmento. Es aceptable porque el rol no cambia durante la sesión; si alguna vez cambia, se resuelve con un `router.refresh()` o un nuevo login.

`/access-denied` vive fuera de ambos layouts para no provocar un loop de redirecciones. Muestra el mensaje y un botón de cerrar sesión; es la salida para una sesión sin fila en `users` o con `status != active`.

### D3 — Perfil y contexto familiar memoizados por request

Nuevo módulo `lib/session-profile.ts`:

```ts
type SessionProfile = {
  id: string;
  fullName: string;
  role: "staff" | "admin" | "parent";
  status: "active" | "inactive";
  daycareId: string;
  avatarUrl: string | null;
};

const getSessionProfile = cache(async (): Promise<SessionProfile | null> => { ... });
```

- Usa `react`'s `cache()` para que layout, página y sidebar compartan una sola lectura de `auth.getUser()` + `users` por request.
- Un segundo helper `getFamilyContext()` (también `cache()`) devuelve `profile` + hijos vinculados activos (`id`, `fullName`, `firstName`, `roomName`, `relationship`). Lo consumen el layout familiar (sidebar) y la página del feed (chips y saludo) sin duplicar queries.
- `instant = false` en `app/page.tsx`, `app/staff/layout.tsx`, `app/family/layout.tsx` y `app/access-denied/page.tsx`, porque todos bloquean sobre `cookies()`. Es el opt-out documentado de Next 16 para un segmento que debe renderizar en request time; el contenido pesado del feed sigue dentro de `<Suspense>` como hoy.
- `getSessionProfile()` no usa `service_role` ni metadata de Auth para el rol: la fuente de verdad es `public.users`.

### D4 — Módulo de datos familiar separado

El feed del staff y el familiar comparten RLS pero no forma de salida:

| | Staff (`lib/posts-data.ts`) | Familia (`lib/family-feed-data.ts`) |
|---|---|---|
| Encabezado | nombres de todos los destinatarios | solo los hijos del padre |
| Autor | "publicado por vos" / "publicado por el equipo" | nombre real del staff |
| Audience | "Para: familia de …" | no se muestra |
| Acciones | Editar, audiencia | ninguna |
| Filtro | — | hijo / todos |

Se crea `lib/family-posts.ts` con los tipos (`FamilyFeedPost`, `FamilyFeedDay`) y `lib/family-feed-data.ts` con la query. No se ramifica `lib/posts-data.ts` con condicionales por rol: eso mezclaría dos contratos y haría que cualquier cambio del staff arrastre al familiar.

Query base (PostgREST, con la sesión del padre):

```ts
supabase
  .from("posts")
  .select(
    "id, type, body, published_at, author_id, " +
      "post_children(children(id, full_name, rooms(name))), " +
      "post_photos(id, storage_path, alt, width, height, position), " +
      "reactions(count), comments(count), " +
      "author:users!posts_author_id_fkey(full_name, avatar_url)",
  )
  .order("published_at", { ascending: false })
  .limit(50);
```

RLS ya devuelve solo posts visibles y solo los vínculos de los hijos del padre. El embed `author` queda `null` si el autor ya no es staff activo; en ese caso la card muestra "Equipo".

**Invariante clave:** para un post visible, `post_children` vacío ⇔ el post no tiene destinatarios. Si tuviera destinatarios, al menos uno sería hijo del padre (si no, `posts` lo ocultaría), así que se vería al menos un vínculo. Esto permite distinguir "toda la sala" de "para mi hijo" sin consultar `post_children` completo.

### D5 — RLS: helpers `security definer` + políticas aditivas

La migración agrega helpers y políticas de `SELECT`. No toca `INSERT`/`UPDATE`/`DELETE` ni el esquema.

Helpers (todos `stable`, `security definer`, `set search_path = ''`, `revoke execute from public, anon` + `grant execute to authenticated`):

| Helper | Devuelve |
|---|---|
| `is_active_parent()` | el caller es `parent` con `status = 'active'` |
| `is_parent_of_child(child_id)` | existe vínculo `parent_children` activo entre el caller y ese niño |
| `can_view_family_post(post_id)` | el caller es parent activo, el post es de su daycare y (no tiene destinatarios **o** incluye un hijo suyo activo) |
| `can_view_post_photo(storage_path)` | esa ruta pertenece a `post_photos` de un post que cumple `can_view_family_post` |
| `can_view_staff_member(user_id)` | el objetivo es `staff`/`admin` activo del mismo daycare que el caller activo |

`security definer` es obligatorio en los que cruzan tablas (`can_view_family_post` consulta `post_children`/`posts`, y `can_view_post_photo` consulta `post_photos`): si fueran `invoker`, la evaluación de la política volvería a disparar RLS sobre esas tablas y se produciría recursión o resultados vacíos. El `search_path = ''` y los nombres calificados evitan hijacking. `is_active_parent` e `is_parent_of_child` solo exponen booleanos sobre el caller y no filtran datos.

Políticas nuevas (todas `to authenticated`, `for select`, aditivas a las del staff):

| Tabla / objeto | `USING` |
|---|---|
| `public.posts` | `can_view_family_post(id)` |
| `public.post_children` | `can_view_family_post(post_id) and is_parent_of_child(child_id)` |
| `public.post_photos` | `can_view_family_post(post_id)` |
| `public.children` | `is_active_parent() and is_parent_of_child(id)` |
| `public.users` | `can_view_staff_member(id)` |
| `public.reactions` | `can_view_family_post(post_id)` |
| `public.comments` | `can_view_family_post(post_id)` |
| `storage.objects` (`post-photos`) | `bucket_id = 'post-photos' and can_view_post_photo(name)` |

Notas:

- La política de `post_children` es la que garantiza que el padre vea solo los nombres de sus hijos en un post compartido.
- La de `children` permite leer nombre, sala y notas del propio hijo, pero no el resto del daycare. `rooms` ya tiene `rooms_select_same_daycare`, así que el embed `rooms(name)` funciona sin política nueva.
- `daycares` no necesita política: el feed familiar no muestra el nombre del daycare (el sidebar dice "Familia").
- `reactions`/`comments` solo ganan `SELECT`; el padre no puede insertar ni borrar. Los contadores son de solo lectura.
- La política de Storage no da acceso al bucket del daycare: cada firma se valida contra una ruta de `post_photos` de un post visible. `post_photos.storage_path` ya tiene índice único, así que el lookup es barato.
- Las políticas del staff no se modifican. El cambio es compatible hacia atrás: antes de desplegar la app nueva, el staff sigue funcionando igual.

### D6 — Feed familiar: render en servidor y filtro por query param

- Los chips son links (`/family?child=<uuid>`), no estado de cliente. La página resuelve `searchParams`, valida el id contra los hijos vinculados y filtra en memoria sobre los posts ya traídos.
- Filtro: sin `child` o "Todos" → todas las publicaciones visibles. Con `child` → posts sin vínculos visibles (toda la sala) **o** posts que incluyen ese hijo. Un id desconocido se trata como "Todos" (RLS ya impide ver otra cosa).
- **Por qué filtrar en memoria:** PostgREST no expresa bien "sin destinatarios **o** incluye a X" en un solo filtro. Con ≤50 posts y RLS como autoridad de visibilidad, filtrar la lista ya segura es más simple y no debilita el aislamiento.
- Agrupación por día: `Intl.DateTimeFormat` con `timeZone: "America/Argentina/Buenos_Aires"` y clave `YYYY-MM-DD` calculada con el mismo formatter (nunca `toISOString()`). Encabezado "HOY · MARTES 17 JUN" para el día actual y "MARTES 17 JUN" para el resto.
- Se reutilizan `POST_TYPE_LABELS` / `POST_TYPE_STYLES` de `lib/posts.ts` para los badges.
- Fotos: se firman solo las rutas de los posts devueltos (`createSignedUrls`, TTL 1 h). Si una firma falla, se omite la foto (mismo criterio que el feed del staff).
- La card familiar es `app/_components/family-post-card.tsx`, un `<article>` sin link (no hay ruta de detalle todavía). Header: avatar + nombre del hijo (o "Anuncio general" / "Toda la sala"), y como subtítulo `HH:mm · {nombre del autor} · Sala {sala}`. Se omite "Maestra" porque `users.role` es `staff`/`admin` y no un cargo; inventarlo violaría "nombre real".
- Contadores: `<span>` estáticos con ♥ y 💬, sin botones. No hay reacción ni comentario desde familia.

### D7 — Navegación y shells

Se extrae `app/_components/sidebar-shell.tsx` (client, por el logout) y se crean dos wrappers:

```
StaffSidebar  -> marca "Sala Soles", ítems Feed · Niños · Avisos · Mi cuenta,
                 slot para CreatePostModal, perfil del staff
FamilySidebar -> marca "Familia", ítems Feed · Resumen del día · Mi cuenta,
                 perfil "Mamá de Thiago" / "Familia de …", sin crear publicación
```

- Los sidebars reciben `profile` (y el contexto familiar) como props desde el layout; se elimina la lectura de rol en el cliente. La visibilidad de ítems se deriva del área, no de una consulta.
- "Avisos", "Mi cuenta" (staff) y "Resumen del día", "Mi cuenta" (familia) se renderizan como `<span aria-disabled>` con estilo atenuado, no como `href="#"`. Así no hay enlaces rotos y se comunica que no está disponible.
- El logout se mueve a `app/_components/sign-out-button.tsx` (client) y se reutiliza en ambos sidebars y en `/access-denied`.
- Los layouts quedan como shell (`div flex min-h-screen` + sidebar + `main` con scroll), pero **cada página conserva su propio contenedor de ancho**: el feed usa 760px, niños 880px y el perfil 820px. Mover el ancho al layout obligaría a excepciones.

### D8 — Transiciones de autenticación sin caché de otro usuario

Después de `signInWithPassword` y de `signOut`, se usa navegación completa (`window.location.assign("/")` / `/login`) en lugar de solo `router.push()`. Con dos áreas y dos roles, el router cache del cliente podría mostrar el shell del usuario anterior durante una transición. La navegación completa descarta ese estado y deja que `/` resuelva el rol con una request limpia.

`activate-invite` sigue redirigiendo a `/login?activated=1`; desde ahí el login resuelve el área con el mismo flujo.

### D9 — Revalidación y limpieza de referencias

- `create-post.ts`: `revalidatePath("/staff")` y `revalidatePath("/family")`. El feed familiar es dinámico por usuario, así que esto limpia el router cache; no pretende invalidar datos por padre.
- `invite-parent.ts`: `revalidatePath("/staff/children/[id]")` con el id concreto (`/staff/children/${childId}`).
- Actualizar `href` de `kid-card.tsx`, el `Link` de volver en el perfil y los comentarios que citan `app/kid/...` en `lib/posts-data.ts`, `lib/family-feed-data.ts`, `invite-parent.ts` y `create-post-modal.tsx`.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Recursión de RLS o fuga entre familias/guarderías por helpers mal diseñados | Helpers `security definer` con `search_path = ''`; probes impersonando al padre real y a un padre sin vínculo; revisión con `@db-security-auditor` antes de cerrar. |
| El guard de layout se percibe como la única barrera | RLS + server actions validan rol; los layouts solo enrutan. Los tests negativos se hacen con la sesión del padre, no confiando en la UI. |
| Un post visible filtra nombres de otros niños vía `post_children` | La política de `post_children` exige `is_parent_of_child(child_id)` además de `can_view_family_post(post_id)`. |
| Storage: firmar rutas fuera del feed | `can_view_post_photo(name)` valida la ruta contra `post_photos` de un post visible, no contra el prefijo del daycare. |
| `instant = false` deja los layouts bloqueando | Aceptado: el shell necesita el perfil. El feed mantiene `<Suspense>` para no bloquear el contenido. Se puede migrar a shell estático + Suspense en otro cambio. |
| Regresiones del staff al mover rutas | Buscar `/kid`, `revalidatePath("/")` y `router.push("/")` en el repo; el build y `tsc` atrapan imports muertos. |
| Contadores de reacciones/comentarios sin datos (0 hoy) | La UI muestra 0; no se siembran datos. El contrato de lectura queda probado con un insert temporal en una transacción con rollback. |
| Router cache muestra datos del usuario anterior al cambiar de rol | Navegación completa en login/logout (D8). |

## Migration Plan

**Orden: base primero, app después.** Las políticas son aditivas y no rompen el staff, así que un despliegue intermedio es seguro.

1. **Especificación de base (convención del repo):** `specs/database/spec-12-lectura-feed-familia.md` con helpers, políticas, matriz de acceso y probes.
2. **Migración versionada** (`supabase/migrations/<version>_add_family_feed_read_policies.sql`) aplicada con `apply_migration` vía `@db-migrator`:
   - crear los 5 helpers y sus grants;
   - crear las 8 políticas de `SELECT`;
   - sin seeds ni cambios de columnas.
   Verificar con `list_tables`, `pg_policies`, `get_advisors` y probes de solo lectura.
3. **App:**
   - crear `lib/session-profile.ts`, `lib/family-posts.ts`, `lib/family-feed-data.ts`;
   - crear `app/page.tsx` (resolver), `app/access-denied/page.tsx`, `app/staff/layout.tsx`, `app/family/layout.tsx`;
   - mover feed, niños y perfil a `app/staff/**`; crear `app/family/page.tsx`;
   - crear `sidebar-shell`, `staff-sidebar`, `family-sidebar`, `family-post-card`, `sign-out-button`; retirar `sidebar.tsx`;
   - ajustar revalidaciones, `href`s, login y logout.
4. **Verificación:** `npm run lint`, `npx tsc --noEmit`, `npm run build`; login con staff y con el padre real; capturas en `.playwright-mcp`; probes RLS cross-familia y cross-daycare.
5. **Rollback:** revertir el commit de app y aplicar una migración nueva que elimine las 8 políticas y los 5 helpers. No se edita la migración aplicada.

## Open Questions

Ninguna que bloquee este cambio. La ruta de detalle de publicación, el lightbox y "Resumen del día" se difieren; si se retoman, se diseñan en un change aparte.
