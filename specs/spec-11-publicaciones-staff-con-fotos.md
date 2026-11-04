# SPEC-11 — Publicaciones del staff con fotos en el feed de `/`

| Campo          | Valor                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Feature**    | Publicar entradas reales desde el modal "Nueva publicación", con 0–2 fotos, persistidas en Supabase y renderizadas en el feed |
| **Rama**       | `feat/spec-11-publicaciones-staff-con-fotos`                                                                              |
| **Estado**     | `Approved`                                                                                          |
| **Fecha**      | `2026-11-04`                                                                                                              |
| **Depends on** | SPEC-06 (modal y catálogo de tipos), SPEC-01/02 (feed, `PostCard`, sidebar), SPEC-07/08/10 database (`daycares`, `users`, `rooms`, `children`) |
| **Spec DB**    | `specs/database/spec-11-posts-fotos-reacciones-comentarios.md`                                                            |
| **Fuente**     | `references/pantallas/crear-publicacion.dc.html` y `references/pantallas/feed.dc.html`                                    |

## Descripción

Convertir el modal "Nueva publicación" en un formulario que **crea una publicación real** y reemplazar el feed estático de `app/page.tsx` por una lectura de `public.posts`.

El staff elige destinatarios (niños activos del daycare o "Toda la sala"), un tipo, escribe la descripción y puede adjuntar hasta **2 fotos**. Las fotos se comprimen en el navegador, se suben al bucket privado `post-photos` y se registran en `post_photos`; el feed las muestra con signed URLs. Los contadores de reacciones y comentarios salen de la base (hoy siempre `0`, porque su UI llega en otra spec).

La creación del post, sus etiquetas y sus fotos entra por la función `public.create_post(...)` de la spec DB: una sola transacción, sin posts a medio crear.

**Alcance:**

- ✅ Datos reales de destinatarios: `children` del daycare del staff (no `lib/children.ts`).
- ✅ Publicar con 0, 1 o 2 fotos: JPEG, PNG o WebP; máximo 5 MB por archivo; compresión a 1600 px de lado mayor, calidad 0.85, salida WebP con fallback JPEG.
- ✅ Bloqueo de fotos si algún niño etiquetado tiene `photo_consent = false`.
- ✅ Feed dinámico de `/`: todos los posts del daycare, orden `published_at desc`, límite 50, con etiqueta de sección "PUBLICACIONES".
- ✅ `PostCard` con 0–2 fotos, autor ("publicado por vos" / "publicado por el equipo"), audiencia, hora y contadores reales.
- ✅ Estado vacío y estado de carga del feed.
- ✅ Estado de error de carga de destinatarios y de publicación, con reintento.
- ✅ Reutilización de la trampa de foco, el scroll lock y el cierre por Escape/overlay de SPEC-06.
- ❌ Editar o borrar publicaciones. El link "Editar" sigue en `href="#"`.
- ❌ Likes y comentarios interactivos: las tablas existen, la UI no.
- ❌ Selección de una sala puntual (`room_id`): "Toda la sala" es todo el daycare.
- ❌ Notificaciones, realtime, borradores, programación o toast de confirmación.
- ❌ Limpieza automática de objetos huérfanos en Storage (solo se intenta borrar lo subido cuando falla la creación).
- ❌ Cambios en `/kid`, `/kid/[id]`, `/login` o `/activate-account` más allá del helper de avatar.

## Reglas globales

- Tailwind v4 con los tokens de `app/globals.css`; valores arbitrarios con bracket. `app/globals.css` no cambia.
- UI en español rioplatense; identificadores, tablas, columnas y funciones en inglés.
- `"use client"` solo en el modal (ya lo tiene). `app/page.tsx`, `PostCard` y `lib/posts-data.ts` siguen siendo server.
- Los clientes de Supabase son los helpers de `lib/supabase/client.ts` (subida desde el navegador) y `lib/supabase/server.ts` (feed y Server Actions). No se crean clientes nuevos.
- Ningún `service_role`, SQL crudo ni `fetch` al endpoint REST desde la app.
- Sin estilos inline, sin librerías nuevas, sin tests nuevos (el proyecto no tiene runner).

## Stack técnico

- Next.js 16.4.2 (App Router) con `cacheComponents: true` y `partialPrefetching: true`.
- React 19 + TypeScript.
- `@supabase/supabase-js` y `@supabase/ssr`.
- APIs del navegador: `crypto.randomUUID()`, `createImageBitmap`, `<canvas>`/`OffscreenCanvas`, `URL.createObjectURL`.

## Dependencia de datos

Esta spec **no funciona** hasta que `@db-migrator` aplique las tres migraciones de `specs/database/spec-11-posts-fotos-reacciones-comentarios.md`:

1. `create_posts_feed_tables` — enum, tablas, RLS y RPC `create_post`.
2. `create_post_photos_bucket` — bucket privado y políticas de Storage.
3. `seed_feed_posts` — los 3 posts del mockup.

Ese spec define:

- `posts(id, daycare_id, author_id, room_id, type, title, body, published_at, created_at, updated_at)`.
- `post_children(post_id, child_id)`; sin filas = "toda la sala".
- `post_photos(post_id, storage_path, alt, width, height, position)`.
- `reactions` y `comments` con RLS staff-only (contadores).
- Bucket privado `post-photos`, 5 MB, `image/webp|jpeg|png`.
- `public.create_post(p_id uuid, p_type public.post_type, p_body text, p_child_ids uuid[], p_photos jsonb) returns uuid`, `security invoker`, que inserta todo en una transacción y valida el prefijo `<daycare_id>/<post_id>/` de cada `storage_path`.

Si el RPC no existe, la publicación falla con el error genérico y el plan de implementación se detiene en el paso 0.

## Tokens

`app/globals.css` no cambia. Se reutilizan `cream`, `card`, `line`, `line-soft`, `line-divider`, `ink`, `body-ink`, `muted`, `muted-dark`, `coral`, `coral-dark`, `coral-soft`, `input-line`, `error`, `error-line`, `modal-bg` y `body.modal-open`.

Brackets ya usados en los componentes: `#6E6359` (chip inactivo), `#B6A99B` (placeholder), `#F4ECE1`/`#CBB89F`/`#DBCDBA`/`#B0A290` (tiles de foto), `#C5503A` (título "Editar" y `+`), `#94887B` (comentarios), `#E0654A` (corazón), `#F4977E`/`#EE8164` (gradiente), `#E7DAC8` (divider del feed), y las sombras `rgba(...)` existentes.

## Modelo de datos

### `lib/posts.ts` (modificar)

Se conserva todo el catálogo de tipos y se reemplazan los mocks por los tipos del feed:

```ts
export type PostType =
  | "meal" | "nap" | "activity" | "achievement" | "mood" | "photo" | "announcement";

export const POST_TYPE_ORDER: PostType[];              // igual
export const POST_TYPE_LABELS: Record<PostType, string>;        // igual
export const POST_TYPE_CHIP_LABELS: Record<PostType, string>;   // igual
export const POST_TYPE_CHIP_STYLES: Record<PostType, { rest: string; selected: string }>; // igual
export const POST_TYPE_STYLES: Record<PostType, { avatar: string; badge: string; dot: string; label: string }>; // igual

export interface FeedPostPhoto {
  id: string;
  url: string;                          // signed URL vigente (1 h)
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface FeedPost {
  id: string;
  type: PostType;
  headerName: string;                   // "Thiago" | "Thiago y Celeste" | "Anuncio general" | "Toda la sala"
  avatarLetter: string;                 // inicial de headerName, "" para anuncio
  time: string;                         // "14:20"
  authorLabel: string;                  // "publicado por vos" | "publicado por el equipo"
  audience: string;                     // "Para: familia de Thiago" | "Para: toda la sala"
  body: string;
  likes: number;
  comments: number;
  photos: FeedPostPhoto[];              // 0..2, ordenadas por position
}
```

- Se **elimina** el array `posts` (queda sin consumidores) y los tipos `Post`/`PostPhoto`.
- `POST_TYPE_ORDER` lo reutiliza la Server Action para validar el tipo; el orden del modal no cambia.
- `PostCard` mantiene el avatar por tipo (`POST_TYPE_STYLES[type].avatar`), como el mockup. El avatar con tono derivado del nombre se usa **solo en los chips del modal**.
- `headerName` y `audience` se calculan en `lib/posts-data.ts`; el componente no formatea datos.

### `lib/posts-data.ts` (crear, solo servidor)

```ts
export type FeedPostsResult =
  | { ok: true; posts: FeedPost[] }
  | { ok: false };

export async function getFeedPosts(): Promise<FeedPostsResult>;
```

Consulta (una sola ida, con conteos embebidos):

```ts
const { data, error } = await supabase
  .from("posts")
  .select(
    "id, type, body, published_at, author_id, " +
      "post_children(children(id, full_name)), " +
      "post_photos(id, storage_path, alt, width, height, position), " +
      "reactions(count), comments(count)",
  )
  .order("published_at", { ascending: false })
  .limit(50);
```

Filas declaradas localmente (los helpers no usan el tipo `Database` generado, mismo patrón que `app/kid/page.tsx`):

```ts
interface FeedPostRow {
  id: string;
  type: PostType;
  body: string;
  published_at: string;
  author_id: string;
  post_children: Array<{ children: { id: string; full_name: string } | null }>;
  post_photos: Array<{
    id: string;
    storage_path: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    position: number;
  }>;
  reactions: Array<{ count: number }>;
  comments: Array<{ count: number }>;
}
```

Reglas de armado:

- **Autoría:** `supabase.auth.getUser()`; `authorLabel = author_id === user.id ? "publicado por vos" : "publicado por el equipo"`. No se joinea `users` (la política `users_select_self` devuelve `null` para otros usuarios y el fallback es más honesto que un nombre vacío).
- **Nombres:** se ordenan alfabéticamente y se unen con `y` (`A`, `A y B`, `A, B y C`). `audience = "Para: familia de " + names`; sin niños → `"Para: toda la sala"`.
- **Encabezado:** `announcement` → `"Anuncio general"`; con niños → la lista de nombres; sin niños y no anuncio → `"Toda la sala"`. `avatarLetter` = primera letra de `headerName` (`""` para anuncio, que usa el megáfono).
- **Hora:** `Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: APP_TIME_ZONE })` con `APP_TIME_ZONE = "America/Argentina/Buenos_Aires"` declarada en este archivo.
- **Contadores:** `reactions[0]?.count ?? 0` y `comments[0]?.count ?? 0` (PostgREST devuelve `[{ count }]`).
- **Fotos:** se piden todas las `storage_path` juntas con `supabase.storage.from("post-photos").createSignedUrls(paths, 3600)`. Se mapea por `path`; si un ítem vuelve con `error` o sin `signedUrl`, esa foto se omite (no se renderiza un `<img>` roto). Se ordenan por `position`.
- **Error de query:** `console.error("[feed] Failed to load posts", error.code)` y `{ ok: false }`. El componente muestra el mensaje de error, no el estado vacío.
- `getFeedPosts` **no** llama a `connection()`: eso queda en el componente dentro de `<Suspense>`, igual que `app/kid/page.tsx`.

### `app/actions/get-post-recipients.ts` (crear)

```ts
export interface PostRecipient {
  id: string;
  fullName: string;
  photoConsent: boolean;
}

export type GetPostRecipientsResult =
  | { ok: true; daycareId: string; recipients: PostRecipient[] }
  | { ok: false; error: string };

export async function getPostRecipients(): Promise<GetPostRecipientsResult>;
```

- `supabase.auth.getUser()`; sin sesión → `{ ok: false, error: "Tu sesión expiró. Volvé a iniciar sesión." }`.
- Perfil: `users.select("id, daycare_id, role, status").eq("id", user.id).single()`; si no es `staff`/`admin` activo → `"No tenés permiso para publicar"`.
- Niños: `children.select("id, full_name, photo_consent, rooms!inner(daycare_id)").eq("status", "active").eq("rooms.daycare_id", profile.daycare_id).order("full_name")`.
- Devuelve `daycareId` porque el navegador lo necesita para armar el path de Storage.
- Error de Supabase → `{ ok: false, error: "No se pudieron cargar los niños" }` y `console.error` con el `code`.
- La acción se llama **al montar el diálogo**, no al renderizar la página: `/` y `/kid` no consultan niños para mostrar el botón.

### `app/actions/create-post.ts` (crear)

```ts
export interface CreatePostPhotoInput {
  storagePath: string;   // "<daycare_id>/<post_id>/<position>.<webp|jpg>"
  alt: string;
  width: number;
  height: number;
}

export interface CreatePostInput {
  postId: string;                 // uuid v4 generado en el cliente
  type: PostType;
  body: string;
  recipientChildIds: string[];    // [] = toda la sala
  photos: CreatePostPhotoInput[]; // 0..2
}

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };
```

Validación en el servidor (la acción es un endpoint público):

- `postId` con regex de UUID v4; `type` en `POST_TYPE_ORDER`; `body.trim()` entre 1 y 2000 caracteres.
- `recipientChildIds`: máximo 100, UUID válidos, sin duplicados.
- `photos.length <= 2`; `storagePath` empieza con `${profile.daycare_id}/${postId}/`; `width`/`height` enteros entre 1 y 10000; `alt` recortado a 300 caracteres.
- Sesión y perfil: `staff`/`admin` activo. Cualquier falla devuelve `{ ok: false, error }` en español sin filtrar detalles.
- Ejecuta:

```ts
const { data, error } = await supabase.rpc("create_post", {
  p_id: input.postId,
  p_type: input.type,
  p_body: body,
  p_child_ids: recipientChildIds,
  p_photos: photos.map((photo) => ({
    storage_path: photo.storagePath, // snake_case: el RPC lee photo->>'storage_path'
    alt: photo.alt,
    width: photo.width,
    height: photo.height,
  })),
});
```

- Mapeo de errores por `error.code` (se loguea `code` y `message` con prefijo `[create-post]`):
  - `42501` → `"No tenés permiso para publicar"`.
  - `23514` → `"Revisá los datos de la publicación"`.
  - `23503` → `"Uno de los niños ya no está disponible"`.
  - `22P02`/`22023` → `"Los datos de la publicación no son válidos"`.
  - Otro → `"No se pudo publicar. Intentá nuevamente."`.
- Éxito: `revalidatePath("/")` y `{ ok: true, postId }`. No hay redirect ni toast.
- `photos` se envía como array de objetos; el RPC asigna `position` por índice (0 y 1).

### `lib/image-compression.ts` (crear, módulo de navegador)

```ts
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 2;

export type PhotoMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface CompressedPhoto {
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
  width: number;
  height: number;
}

export type PhotoErrorCode =
  | "too_large"
  | "unsupported_type"
  | "decode_failed"
  | "encode_failed"
  | "too_large_after_compression";

export class PhotoError extends Error {
  constructor(readonly code: PhotoErrorCode);
}

export async function compressPhoto(file: File): Promise<CompressedPhoto>;
```

Algoritmo:

1. `file.size > MAX_PHOTO_BYTES` → `too_large`. El límite de 5 MB se valida sobre el archivo original **y** sobre el blob comprimido.
2. `file.type` fuera de `image/jpeg|png|webp` → `unsupported_type` (HEIC/HEIF no se acepta).
3. `createImageBitmap(file, { imageOrientation: "from-image" })`; si falla → `decode_failed`.
4. Lado mayor a 1600 px: `scale = Math.min(1, 1600 / Math.max(width, height))`; dimensiones destino redondeadas, mínimo 1 px.
5. Canvas (OffscreenCanvas si existe, si no `document.createElement("canvas")`), fondo blanco (`#FFFFFF`) antes de dibujar para que un PNG con transparencia no quede negro si hay que caer a JPEG.
6. `convertToBlob({ type: "image/webp", quality: 0.85 })` (o `toBlob` con callback). Si el blob resultante **no** es `image/webp`, se vuelve a codificar como `image/jpeg` con la misma calidad; `extension = "jpg"`.
7. Si el blob final supera 5 MB → `too_large_after_compression`.
8. `bitmap.close()` en `finally`. El canvas se descarta.

La compresión corre en el cliente y no bloquea el submit: el modal muestra "Procesando…" mientras tanto.

## Archivos

### Crear

#### `app/actions/get-post-recipients.ts`

Server Action descripta arriba. `"use server"` al inicio. Devuelve tipos serializables (sin `File` ni `Blob`).

#### `app/actions/create-post.ts`

Server Action descripta arriba. `"use server"` al inicio. Importa `POST_TYPE_ORDER` y `type PostType` de `@/lib/posts`, y `createClient` de `@/lib/supabase/server`.

#### `lib/posts-data.ts`

Data access del feed descripto arriba. Solo lo importa `app/page.tsx`.

#### `lib/image-compression.ts`

Módulo de compresión descripto arriba. Solo lo importa el modal.

### Modificar

#### `app/_components/create-post-modal.tsx`

Sigue siendo el único componente cliente del feed. Cambios:

**Estado del diálogo**

```ts
type RecipientsState =
  | { status: "loading" }
  | { status: "ready"; daycareId: string; recipients: PostRecipient[] }
  | { status: "error" };

interface SelectedPhoto {
  id: string;                              // uuid local
  blob: Blob;
  previewUrl: string;                      // URL.createObjectURL(blob)
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
  width: number;
  height: number;
}
```

- `recipientsState`, `selection: RecipientSelection`, `selectedType`, `descriptionRef`, `photos: SelectedPhoto[]`, `isProcessingPhotos`, `isSubmitting`, `submitError`, `photoError`.
- `previewUrlsRef` acumula las URLs creadas; se revocan todas al desmontar y al quitar una foto.

**Carga de destinatarios**

- Al montar el diálogo, `useEffect` llama `getPostRecipients()` con un flag `cancelled` en el cleanup.
- `loading`: se reemplazan los chips por 3 placeholders (`h-[40px] w-[112px] animate-pulse rounded-full bg-[#F0E6D8]`) y un `<span className="sr-only">Cargando niños…</span>` dentro de un `role="status"`.
- `ready`: chips de **todos** los niños activos del daycare, ordenados por nombre. Si no hay niños, solo queda "Toda la sala" y arranca seleccionada.
- Selección inicial: primer niño de la lista (como el mockup); sin niños → `{ kind: "room" }`.
- `error`: mensaje `"No se pudieron cargar los niños"` + botón `"Reintentar"` (`text-[13px] font-extrabold text-coral-dark`) que repite la carga. "Publicar" queda deshabilitado mientras el estado no sea `ready`.
- Los chips conservan clases, tamaños y colores de SPEC-06. El tono del avatar se deriva con `getAvatarToneForName(firstName)`; la letra, con la inicial de `firstName`. "Toda la sala" sigue sin avatar.

**FOTOS**

- `<input type="file" id="create-post-photo-input" ref={photoInputRef} accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handlePhotosChange} />` fuera del flujo de foco (atributo `hidden` → sin rects → la trampa lo ignora).
- El tile "Agregar" pasa de `<div aria-hidden>` a `<button type="button">` con el mismo aspecto, `aria-label="Agregar foto"`, que dispara `photoInputRef.current?.click()`. Después de cada cambio se resetea `input.value = ""`.
- Se muestra solo si `photos.length < 2`. `disabled` si `isProcessingPhotos` o si hay un niño etiquetado sin consentimiento.
- Cada foto elegida se ve como tile de 96×96 con la preview (`<img src={previewUrl} alt="" className="size-full rounded-[14px] object-cover" />`) y un botón circular de 24 px arriba a la derecha con `aria-label={"Quitar foto " + (index + 1)}` y el ícono `×`; al quitarla se revoca su URL.
- Mientras comprime: tile de 96×96 con `animate-pulse`, texto `"Procesando…"` y `role="status"`; el tile "Agregar" queda deshabilitado.
- Si se eligen más fotos de las que caben, se procesan las primeras que entren y se muestra `"Podés agregar hasta 2 fotos"`.
- Errores de archivo (`photoError`, `role="alert"`, `mt-[8px] text-[13px] font-bold text-error`); se limpian al agregar o quitar una foto:
  - `too_large` / `too_large_after_compression` → `"La foto supera los 5 MB"`.
  - `unsupported_type` → `"Formato no soportado: usá JPEG, PNG o WebP"`.
  - `decode_failed` / `encode_failed` → `"No se pudo procesar la imagen"`.
- El texto del mockup "Agregar" y el `+` rojo se conservan. El tile de "imagen" decorativo de SPEC-06 se elimina: ahora el primer slot lo ocupa la preview real.

**Consentimiento de imagen**

- `blockedRecipients` = niños seleccionados con `photo_consent === false`.
- Si hay alguno:
  - El tile "Agregar" queda `disabled` y con `opacity-50`.
  - Se muestra debajo de FOTOS: `"No podés adjuntar fotos: {nombres} sin autorización de imagen."` (`text-[12.5px] font-bold text-error`, `role="status"`).
  - Si ya había fotos cargadas (se agregaron antes de seleccionar a ese niño), el mensaje pasa a `"Quitá las fotos para publicar: {nombres} sin autorización de imagen."` y el submit se bloquea.
- Plural/singular: `"Thiago no tiene autorización de imagen"` / `"Thiago y Celeste no tienen autorización de imagen"`.

**Descripción**

- Sin cambios visuales. `maxLength={2000}` para no chocar con el CHECK de la base. Sigue siendo no controlada (`descriptionRef`).
- El contador de caracteres no se agrega (no está en el mockup).

**Errores de envío**

- `submitError` se muestra al final del formulario, debajo de FOTOS: `<p role="alert" className="mt-[14px] text-[13px] font-bold text-error">`.
- "Publicar" en el header pasa a `disabled={isSubmitting}` con `disabled:opacity-50`; el texto cambia a "Publicando…" mientras dura el envío.
- Si el diálogo se desmonta durante una compresión o un envío, los callbacks asíncronos consultan un `cancelledRef` antes de tocar estado.

**Submit**

`handleSubmit(event)`:

1. Valida destinatarios (`kind === "children"` con 0 ids → error existente) y descripción (`trim()` vacío → error existente). Foco al primer campo inválido, como hoy.
2. Si `recipientsState.status !== "ready"` → `submitError = "Esperá a que se carguen los destinatarios"`. Si está listo, guardar `const daycareId = recipientsState.daycareId` para usarlo en el loop (el narrowing de un estado no sobrevive a los `await`).
3. Si `isProcessingPhotos` → `submitError = "Esperá a que se procesen las fotos"`.
4. Si `blockedRecipients.length > 0 && photos.length > 0` → `photoError` con el mensaje de consentimiento y foco al primer botón de quitar.
5. `setIsSubmitting(true)`, `setSubmitError(null)`.
6. `const postId = crypto.randomUUID(); const uploadedPaths: string[] = [];`
7. Sube las fotos **en orden** con el cliente de navegador:

```ts
const supabase = createClient();
for (const [index, photo] of photos.entries()) {
  const path = `${daycareId}/${postId}/${index}.${photo.extension}`;
  const { error } = await supabase.storage
    .from("post-photos")
    .upload(path, photo.blob, {
      contentType: photo.contentType,
      upsert: false,
      cacheControl: "3600",
    });
  if (error) throw new Error("upload_failed");
  uploadedPaths.push(path);
}
```

8. Llama `createPost({ postId, type, body: descriptionRef.current.value, recipientChildIds, photos: photos.map(...) })` usando **los mismos paths** del paso 7 (`<daycareId>/<postId>/<index>.<ext>`), `width`/`height` de cada foto y un `alt` recortado a 300: `body.slice(0, 280)` + (si hay 2) `" (foto N de 2)"`. `recipientChildIds` es `[]` cuando la selección es "Toda la sala".
9. Éxito: `onClose()` (el padre ya devuelve el foco al disparador) y `router.refresh()` (`useRouter` de `next/navigation`). El post nuevo aparece arriba por `published_at desc`.
10. Falla de subida: `submitError = "No se pudieron subir las fotos. Intentá nuevamente."`; se borran los objetos ya subidos con `supabase.storage.from("post-photos").remove(uploadedPaths)` best-effort.
11. Falla de `createPost`: se muestra `result.error`, se borran los objetos subidos (`remove`) best-effort y el modal queda abierto con todos los datos.
12. `finally`: `setIsSubmitting(false)`.

- Mientras `isSubmitting`: "Publicar" muestra `"Publicando…"` y queda `disabled`; "Cancelar", Escape, click en el overlay y "Quitar foto" quedan deshabilitados (`submittingRef` para que el handler de teclado no cierre el modal).
- Cada intento genera un `postId` nuevo, así que un reintento nunca choca con un path ya subido (`upsert: false`).
- Si el usuario no tiene sesión, `createPost` devuelve `"Tu sesión expiró. Volvé a iniciar sesión."` y se muestra en `submitError`.

**Accesibilidad**

- Se conserva el foco inicial en la descripción, Escape, overlay, foco al disparador, `aria-modal`, `aria-labelledby` y `body.modal-open`.
- La trampa de foco ya consulta `button, input, textarea, select, a[href]` y descarta `disabled`, sin layout y radios no marcados: los botones de quitar y "Agregar" entran solos; el input de archivo (`hidden`) queda afuera.
- Los placeholders de carga no son focusables.
- Los mensajes de error y de consentimiento usan `role="alert"`/`role="status"` y se referencian con `aria-describedby` desde el grupo de fotos (`aria-describedby="create-post-photos-error"` cuando hay error).

#### `app/_components/post-card.tsx`

- Cambia el tipo de la prop a `FeedPost`. Mantiene el layout, el badge por tipo, el avatar por tipo y la fila de acciones.
- Cabecera con `post.headerName`, `post.avatarLetter`, `post.time` y `post.authorLabel` exactamente como hoy; el anuncio conserva el megáfono (`post.type === "announcement"`).
- Audiencia: `post.audience`.
- Fotos (reemplaza el bloque `post.photo`):

```tsx
{post.photos.length > 0 ? (
  <div
    className={
      post.photos.length === 1
        ? "mt-[14px]"
        : "mt-[14px] grid grid-cols-2 gap-2"
    }
  >
    {post.photos.map((photo) => (
      <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="block">
        <img
          src={photo.url}
          alt={photo.alt || "Foto de la publicación"}
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
          loading="lazy"
          decoding="async"
          className={
            post.photos.length === 1
              ? "max-h-[420px] w-full rounded-[16px] border border-line object-cover"
              : "aspect-square w-full rounded-[16px] border border-line object-cover"
          }
        />
      </a>
    ))}
  </div>
) : null}
```

- Se usa `<img>`, no `next/image`: las URLs son firmadas y efímeras, y el `@next/next/no-img-element` es un warning ya aceptado por el proyecto. `width`/`height` guardados evitan saltos de layout.
- `likes` y `comments` salen del feed. "Editar" sigue en `href="#"` y el link de comentarios también.
- Sin fotos, la tarjeta no muestra ningún placeholder (el post sembrado de "actividad" ya no muestra el recuadro dashed).

#### `app/page.tsx`

- Sigue siendo server component. Header (`GUARDERÍA · SALA SOLES`, `Buenas, Caro`, `12 niños · martes 17 jun`) **no cambia**.
- `<CreatePostModal variant="feedBar" />` no cambia.
- La etiqueta `PUBLICADO HOY` pasa a `PUBLICACIONES` (mismas clases). El feed deja de ser "del día".
- Debajo, `<Suspense fallback={<FeedSkeleton />}>` con:

```tsx
async function FeedContent() {
  await connection();
  const result = await getFeedPosts();
  // error | vacío | lista
}
```

- **Error:** tarjeta `rounded-[20px] border border-line bg-card px-6 py-10 text-center` con `role="alert"`: `"No se pudieron cargar las publicaciones"` + `"Actualizá la página para reintentar."`.
- **Vacío:** tarjeta con borde dashed `#DBCDBA`, `py-12`, título Fredoka `"Todavía no hay publicaciones"` y texto `"Compartí el primer momento del día con las familias."`.
- **Lista:** `<div className="flex flex-col gap-4">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>`.
- **`FeedSkeleton`** (en el mismo archivo, no exportado): `role="status"` con `<span className="sr-only">Cargando publicaciones…</span>` y dos bloques `aria-hidden` de `h-[180px] animate-pulse rounded-[20px] border border-line bg-card`.

#### `lib/children.ts`

- Agregar y exportar:

```ts
const AVATAR_TONE_ORDER: AvatarTone[] = ["blue", "pink", "green", "yellow", "purple"];

export function getAvatarToneForName(name: string): AvatarTone {
  const index = (name.charCodeAt(0) || 0) % AVATAR_TONE_ORDER.length;
  return AVATAR_TONE_ORDER[index];
}
```

- Eliminar el array mock `children` (queda sin consumidores al sacar `RECIPIENTS` del modal). Se conservan `AvatarTone`, `AVATAR_TONES`, `Parent`, `Child`, `PARENT_STATUS_LABELS` y `PARENT_STATUS_META`.
- Sin este cambio, el modal seguiría mostrando Mateo, Sofía y Benjamín en vez de los niños reales.

#### `app/kid/[id]/page.tsx`

- Reemplazar la función local `getToneForName` y el array `TONES` por `getAvatarToneForName` importado de `@/lib/children`. Es un cambio mecánico de 4 líneas; no altera el render.

## Plan de implementación

0. Verificar que las migraciones de la spec DB estén aplicadas: existen `posts`, `post_children`, `post_photos`, `reactions`, `comments`, el bucket `post-photos` y el RPC `create_post`. Si falta alguna, detenerse y avisar: esta spec no se implementa a medias.
1. `lib/posts.ts`: reemplazar `Post`/`PostPhoto`/`posts` por `FeedPost`/`FeedPostPhoto` y conservar el catálogo. Verificación: `npx tsc --noEmit` marca solo los consumidores que se actualizan en los pasos siguientes.
2. `lib/children.ts`: agregar `getAvatarToneForName` y borrar el array mock; actualizar `app/kid/[id]/page.tsx`. Verificación: `/kid/[id]` muestra los mismos avatares que antes.
3. `lib/posts-data.ts` + `app/page.tsx`: feed real con `connection()`, Suspense, error, vacío y skeleton; cambiar la etiqueta a `PUBLICACIONES`. Verificación: `/` muestra los 3 posts sembrados, ordenados por hora descendente, con "publicado por vos" y contadores en 0.
4. `post-card.tsx`: nuevo tipo y render de 0–2 fotos. Verificación: los posts sin fotos no muestran placeholder; con fotos de prueba, 1 y 2 se ven como el bloque definido.
5. `app/actions/get-post-recipients.ts` + carga diferida en el modal (chips reales, loading, error y reintento, defaults). Verificación: los chips muestran "Thiago" y "Celeste" con el tono derivado de su nombre; sin niños, queda "Toda la sala".
6. `lib/image-compression.ts`. Verificación manual en el navegador con JPEG, PNG, WebP, un archivo > 5 MB y un `.heic`: previews, dimensiones ≤ 1600 px y errores correctos.
7. UI de FOTOS en el modal: agregar/quitar, previews, "Procesando…", límite de 2 y errores. Verificación: no se puede pasar de 2; quitar revoca la preview; "Agregar" desaparece con 2 fotos.
8. Consentimiento: bloqueo del tile y del submit cuando hay un niño sin `photo_consent`. Verificación: como hoy ambos niños tienen `true`, se prueba con un override local temporal (`photoConsent: false` en la respuesta de la acción), se verifican los dos mensajes y se revierte el override antes de cerrar.
9. `app/actions/create-post.ts` + submit completo (subida, RPC, `router.refresh()`, limpieza y errores). Verificación en Supabase (solo lectura): `select` de `posts`, `post_children`, `post_photos` y `storage.objects` para el último post; el post aparece primero en `/`.
10. Pruebas de borde: publicar sin foto, con 1, con 2, a un niño, a dos niños, a toda la sala, con una publicación `announcement`; cuerpo vacío; 2001 caracteres; doble click en "Publicar"; Escape durante la subida.
11. Verificación visual contra `crear-publicacion.dc.html` y `feed.dc.html` con Playwright MCP; capturas en `.playwright-mcp/` y comparación de `getBoundingClientRect`/`getComputedStyle` de la tarjeta, el modal, los chips y la fila de acciones.
12. Cierre: `npm run lint`, `npx tsc --noEmit`, `npm run build`; `git status` solo con los archivos de esta spec.

## Checklist de aceptación

**Datos y feed**

- [ ] `/` lee las publicaciones de `public.posts` (no de `lib/posts.ts`) y las muestra de la más nueva a la más vieja, máximo 50.
- [ ] Se ven las 3 publicaciones del seed, con los tipos `achievement`, `activity` y `announcement`, sus textos y sus horas.
- [ ] El post de `achievement` y el de `activity` muestran el nombre y la inicial del primer niño activo; el `announcement` muestra "Anuncio general" y el megáfono.
- [ ] La audiencia de los dos primeros dice "Para: familia de {niño}" y la del anuncio "Para: toda la sala".
- [ ] Los contadores de reacciones y comentarios muestran los valores reales de la base (0 en el seed).
- [ ] La etiqueta de la sección dice "PUBLICACIONES" y conserva el estilo del mockup.
- [ ] Los posts con autor distinto del usuario actual muestran "publicado por el equipo".
- [ ] El header ("GUARDERÍA · SALA SOLES", "Buenas, Caro", "12 niños · martes 17 jun") no cambió.
- [ ] Mientras carga, se ve el skeleton con "Cargando publicaciones…" para lectores de pantalla.
- [ ] Con la tabla vacía se ve el estado vacío, no una lista en blanco.
- [ ] Si la consulta falla, se ve "No se pudieron cargar las publicaciones" con `role="alert"`.

**Destinatarios**

- [ ] Los chips salen de `public.children` (hoy "Thiago" y "Celeste"), no del mock.
- [ ] Cada chip usa el tono derivado de la inicial del nombre y la letra correcta.
- [ ] Mientras carga se ven placeholders y "Cargando niños…" para lectores de pantalla.
- [ ] Si la carga falla, se ve "No se pudieron cargar los niños" con "Reintentar", que vuelve a consultar.
- [ ] "Publicar" está deshabilitado mientras los destinatarios no estén listos.
- [ ] Un daycare sin niños muestra solo "Toda la sala", seleccionada.
- [ ] Se mantienen la selección múltiple, la exclusividad de "Toda la sala" y los mensajes de error de SPEC-06.

**Fotos**

- [ ] Se pueden adjuntar 0, 1 o 2 fotos; con 2, el tile "Agregar" desaparece.
- [ ] El selector acepta solo JPEG, PNG y WebP; un `.heic` muestra "Formato no soportado: usá JPEG, PNG o WebP".
- [ ] Un archivo de más de 5 MB muestra "La foto supera los 5 MB" y no se agrega.
- [ ] Una foto grande se comprime a un lado mayor ≤ 1600 px y se sube como WebP (o JPEG si el navegador no codifica WebP), con menos de 5 MB.
- [ ] La preview de 96×96 respeta el recorte (`object-cover`) y el botón de quitar tiene `aria-label="Quitar foto N"`.
- [ ] Quitar una foto la saca de la lista y libera su `objectURL`.
- [ ] Mientras comprime se ve "Procesando…" y no se puede volver a abrir el selector.
- [ ] Con un niño sin `photo_consent`, "Agregar" queda deshabilitado y se ve el mensaje de consentimiento.
- [ ] Si había fotos y se selecciona un niño sin consentimiento, el submit se bloquea con el mensaje para quitarlas.
- [ ] Con consentimiento, el post se publica con las fotos y se ven en la tarjeta (1 foto grande, 2 en grilla).

**Publicación**

- [ ] "Publicar" con destinatarios, tipo y descripción válidos crea una fila en `posts`, las filas de `post_children` y las de `post_photos`, y sube los objetos a `<daycare_id>/<post_id>/<position>.<ext>`.
- [ ] El post nuevo aparece primero en `/` sin recargar la página (`router.refresh()`).
- [ ] El modal se cierra al publicar y el foco vuelve al disparador.
- [ ] Publicar sin foto funciona y la tarjeta no muestra placeholder.
- [ ] "Toda la sala" crea el post sin filas en `post_children` y la tarjeta dice "Para: toda la sala".
- [ ] Un cuerpo vacío o de más de 2000 caracteres no se envía.
- [ ] Un doble click en "Publicar" crea una sola publicación.
- [ ] Si la subida falla, se ve "No se pudieron subir las fotos. Intentá nuevamente." y no se crea el post.
- [ ] Si `create_post` falla, se muestra el error, el modal queda abierto con los datos y no quedan objetos subidos (o se intentó borrarlos).
- [ ] Un usuario `parent` o sin sesión recibe el mensaje de permiso/sesión y no se crea nada.
- [ ] Un post de otro daycare no aparece en el feed (RLS de la spec DB).

**Accesibilidad y ciclo de vida**

- [ ] El diálogo conserva `role="dialog"`, `aria-modal`, `aria-labelledby`, el foco inicial en la descripción, Escape, overlay y retorno de foco.
- [ ] Tab y Shift+Tab no salen de la tarjeta; el input de archivo no es un tab stop; "Agregar" y los botones de quitar sí lo son.
- [ ] Mientras se publica, "Publicar" muestra "Publicando…" y está deshabilitado; Escape y el overlay no cierran el modal.
- [ ] Los errores de fotos, consentimiento y envío se anuncian (`role="alert"`/`role="status"`) y el textarea conserva `aria-invalid`/`aria-describedby`.
- [ ] Al reabrir el modal, el formulario vuelve al estado inicial (sin fotos, sin errores, primer niño y Comida).
- [ ] Con el modal abierto el fondo no scrollea; al cerrar se conserva la posición.

**Arquitectura y verificación**

- [ ] `app/page.tsx`, `post-card.tsx` y `lib/posts-data.ts` siguen siendo server components.
- [ ] El único `"use client"` del feed sigue siendo `create-post-modal.tsx` (y `sidebar.tsx`, que ya lo era).
- [ ] No se agregaron dependencias ni estilos inline; `app/globals.css` no cambió.
- [ ] No hay datos mock de niños ni de posts en el camino de render.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Las capturas de Playwright quedaron en `.playwright-mcp/` y la comparación visual con los mockups no muestra diferencias no intencionales.

## Decisiones

- **Sí:** publicar de verdad. El pedido es persistir en Supabase y ver el post en el feed; el modal de SPEC-06 queda como cascarón hasta esta entrega.
- **Sí:** destinatarios reales desde `children`. Los nombres del mockup (Mateo, Sofía, Benjamín) no existen en la base; mostrarlos rompería la trazabilidad entre lo que se publica y quién lo recibe.
- **Sí:** "Toda la sala" = todos los niños activos del daycare (`room_id = null`, sin `post_children`). El concepto de sala puntual no está en el pedido y el daycare tiene 3 salas.
- **Sí:** 7 tipos, incluido `mood`. Ya son parte de la UI y del enum de la spec DB.
- **Sí:** 0–2 fotos con compresión en el cliente. Evita subir originales de decenas de MB y respeta el límite de 5 MB del bucket.
- **Sí:** 5 MB se valida sobre el archivo original y sobre el comprimido. Es la lectura literal del requisito y evita que un archivo aceptado en el selector falle recién en Storage.
- **Sí:** WebP con fallback JPEG y fondo blanco. WebP pesa menos; el fondo blanco evita que un PNG transparente quede negro si el navegador no codifica WebP.
- **Sí:** subir primero y crear después, con limpieza best-effort. El path necesita el `postId`, y el `postId` lo genera el cliente; si el RPC falla, se borran los objetos subidos. Si la limpieza falla, quedan huérfanos (fuera de alcance).
- **Sí:** RPC transaccional `create_post`. PostgREST no anida inserts one-to-many y tres inserts sueltos dejarían posts huérfanos sin política `DELETE` para limpiarlos.
- **Sí:** el `postId` se genera por intento. Un reintento tras un fallo usa paths nuevos y no choca con `upsert: false`.
- **Sí:** `alt` derivado del cuerpo de la publicación. El mockup no tiene campo de alt y el cuerpo describe el momento; un alt vacío sería peor para lectores de pantalla.
- **Sí:** el feed pide todas las signed URLs en un solo `createSignedUrls` (1 hora). Menos requests y un solo punto de fallo; si una falla, esa foto se omite.
- **Sí:** `<img>` en vez de `next/image`. Las URLs firmadas expiran y no encajan con el optimizador; `width`/`height` guardados mantienen el layout estable.
- **Sí:** "publicado por el equipo" para autores ajenos. `users_select_self` impide leer el nombre de otro staff; mostrar "publicado por el equipo" es correcto sin abrir `users`.
- **Sí:** etiqueta "PUBLICACIONES". El feed ya no es solo del día: trae los últimos 50 posts.
- **Sí:** estado vacío y estado de error explícitos. Sin ellos, una tabla vacía o una consulta caída se ven igual que "no hay novedades".
- **Sí:** sin toast. El post apareciendo arriba después de `router.refresh()` es la confirmación, igual que en "Agregar niño".
- **Sí:** hora en `America/Argentina/Buenos_Aires`. La UI es rioplatense; el server de producción corre en UTC y sin zona fija las horas se verían corridas.
- **No:** editar o borrar publicaciones. El link "Editar" queda en `#` como hoy.
- **No:** UI de likes y comentarios. Las tablas se crean ahora para que los contadores sean reales, pero la interacción es otra spec.
- **No:** `room_id` desde la UI. No está en el pedido y agrega un selector que el mockup no tiene.
- **No:** notificaciones, realtime ni toast. Fuera de alcance.
- **No:** limpieza automática de huérfanos en Storage. Requiere un job o un cron que no existe.
- **Sí:** borrar el array mock `children` de `lib/children.ts` y centralizar el tono por nombre en `getAvatarToneForName`, que usan el modal y el perfil del niño.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La spec DB no está aplicada y el feed/RPC fallan. | El plan arranca con el paso 0; sin tablas, bucket y `create_post` no se escribe código. |
| Una signed URL de 1 hora expira en una pestaña abierta mucho tiempo. | La foto se omite si no hay URL y un `router.refresh()`/recarga regenera las URLs. |
| Subir primero y fallar el RPC deja objetos huérfanos. | `storage.remove` best-effort de los paths subidos; la limpieza automática queda documentada como pendiente. |
| Un reintento con el mismo `postId` chocaría con `upsert: false`. | Cada intento genera un `postId` nuevo. |
| `createImageBitmap` o `convertToBlob` no existen en navegadores viejos. | Fallback a `Image` + `<canvas>`/`toBlob` está previsto para WebP/JPEG; si el navegador no decodifica, se muestra "No se pudo procesar la imagen". |
| La orientación EXIF de fotos de celular sale rotada. | `createImageBitmap(file, { imageOrientation: "from-image" })`. |
| Dos fotos y muchas publicaciones hacen lento el feed por las signed URLs. | Un solo `createSignedUrls` por request, `loading="lazy"`, `decoding="async"` y límite de 50 posts. |
| El modal crece con muchos niños del daycare. | Los chips envuelven (`flex-wrap`) y el overlay es `overflow-y-auto`; el caso normal son pocos niños. |
| El tono por nombre puede repetir color entre niños. | Es solo estético y replica el criterio de `/kid/[id]`; no identifica al niño. |
| La hora fija en `America/Argentina/Buenos_Aires` no sirve para guarderías de otra zona. | Se centraliza en una constante (`APP_TIME_ZONE`) para cambiarla cuando el producto se internacionalice. |
| El usuario puede publicar sin fotos aunque el tipo sea "Foto". | Es una regla de producto aceptada: el tipo describe el contenido, no obliga a adjuntar archivos. |
| `router.refresh()` no muestra el post si la cookie de sesión expiró. | La Server Action devuelve "Tu sesión expiró…" y el modal queda abierto con el error. |
| Un padre con la publishable key intenta leer `posts` o firmar URLs. | RLS staff-only en las 5 tablas y en `storage.objects` (spec DB). |

## Qué **no** está en este spec

- Editar, borrar o archivar publicaciones; el link "Editar" queda en `#`.
- Likes, comentarios, reacciones y sus UI.
- El feed de padres y las políticas de lectura para familias.
- Notificaciones, correos, realtime y resumen diario.
- Selección de sala (`room_id`), publicaciones programadas o borradores.
- Filtros por tipo, por niño o por fecha en el feed.
- Paginación o scroll infinito (solo el límite de 50).
- Limpieza automática de objetos huérfanos en Storage.
- Tests automatizados (el proyecto no tiene runner).
- Responsive/mobile: los mockups de referencia son desktop.
- Cambios en `/login`, `/activate-account`, `/kid` o `/kid/[id]` más allá del helper de avatar.
