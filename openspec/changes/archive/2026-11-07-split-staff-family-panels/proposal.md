# Proposal

## Why

Hoy la app tiene un único panel: cualquier usuario autenticado cae en el feed del staff y el rol solo se usa para ocultar "Niños" en el sidebar. Un padre vinculado puede entrar a `/kid` y, aunque RLS bloquea lecturas, no tiene panel propio ni feed. La base ya distingue `staff`, `admin` y `parent`, existen vínculos padre-hijo e invitaciones, y los mockups de familia están diseñados pero no implementados. Separar los paneles ahora evita que cada pantalla nueva tenga que resolver el rol por su cuenta.

## What Changes

- `/` pasa a ser un resolver de rol: lee `public.users.role` y redirige a `/staff` o `/family`.
- El panel del staff se mueve a `/staff` (feed) y `/staff/children`, `/staff/children/[id]`.
- **BREAKING**: cambian las URLs del staff (`/` → `/staff`, `/kid` → `/staff/children`). No hay links externos; sí cambian `revalidatePath` y los `href` internos.
- Nueva área `/family` con layout, sidebar y feed propios, alineada a `references/pantallas/familia-feed.dc.html`.
- Guard de rol en cada layout de área: un `parent` no accede a `/staff/*`; un `staff`/`admin` no accede a `/family/*`. El proxy sigue validando solo la sesión.
- Políticas RLS de lectura para padres: publicaciones visibles (toda la sala o un hijo vinculado), vínculos `post_children` propios, fotos de esas publicaciones, objetos de Storage asociados, hijos vinculados y nombre/avatar del staff autor.
- Feed familiar con chips por hijo, autor real, fotos y contadores de reacciones/comentarios de solo lectura.
- Fuera de alcance: "Resumen del día", "Mi cuenta" familiar, avisos, reacciones/comentarios de padres, notificaciones, correos y resumen diario.

## Capabilities

### New Capabilities

- `panel-separation`: resolución de rol al entrar, rutas y layouts separados por área, y guardas de acceso entre staff y familia.
- `family-feed`: feed de solo lectura para padres con visibilidad acotada a sus hijos y a los anuncios/toda la sala, autor, fotos y contadores.

### Modified Capabilities

Ninguna. `openspec/specs/` está vacío; los specs actuales viven en `specs/` y no forman parte del inventario de OpenSpec.

## Impact

- **App:** `app/page.tsx`, nuevo `app/staff/**`, nuevo `app/family/**`, `app/_components/sidebar.tsx`, `app/_components/post-card.tsx`, `lib/posts-data.ts` (o un `lib/family-posts-data.ts`), `app/actions/create-post.ts` (`revalidatePath`). `proxy.ts` no cambia de comportamiento.
- **Base de datos:** una migración versionada con helpers y políticas RLS de `SELECT` en `posts`, `post_children`, `post_photos`, `children`, `users`, `reactions`, `comments` y `storage.objects`. Sin cambios de columnas ni de enums.
- **Datos consultados por la app:** `users.role/full_name/avatar_url`, `parent_children`, `children`, `rooms`, `posts`, `post_children`, `post_photos`.
- **Pruebas:** manuales con el staff de prueba (`anibal@gmail.com`) y el padre real (`anibaldel005@gmail.com`, vinculado a Thiago) más probes de aislamiento RLS.
- **Dependencias:** ninguna nueva.
