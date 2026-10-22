# SPEC-06 — Modal "Nueva publicación" sobre `/` y `/kid`

| Campo          | Valor                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| **Feature**    | Modal de creación de publicación disparado desde el sidebar y desde el feed                            |
| **Rama**       | `feat/spec-06-modal-crear-publicacion`                                                                |
| **Estado**     | `Approved`                                                                                            |
| **Fecha**      | `2026-10-22`                                                                                          |
| **Depends on** | SPEC-01 (feed/sidebar/`PostType`), SPEC-04 (patrón de modal y scroll lock), SPEC-05 (chips con `peer`) |
| **Fuente**     | `references/pantallas/crear-publicacion.dc.html`                                                      |
| **Referencia** | `references/screenshots/compose.png` y `references/screenshots/compose2.png`                           |

## Descripción

Convertir `crear-publicacion.dc.html` (hoy una pantalla completa) en un **modal** que se abre al presionar **"Nueva publicación"** en `app/_components/sidebar.tsx` (visible en `/` y `/kid`) y al presionar la barra **"Compartí un momento…"** del feed `/`.

El modal replica la tarjeta del mockup (ancho máximo 580px, radio 24px, fondo `#FBF4EC`, borde `#ECE0D0`, sombra `0 20px 50px -24px rgba(63,54,46,.35)`) con sus 4 bloques: **PARA**, **TIPO**, **DESCRIPCIÓN** y **FOTOS**.

**Alcance:**

- ✅ Abrir/cerrar el modal desde los dos disparadores, con overlay, Escape, click en el fondo, trampa de foco, retorno de foco y bloqueo de scroll.
- ✅ PARA: chips de los 3 primeros niños de `lib/children.ts` (Mateo, Sofía, Benjamín) + "Toda la sala", con selección múltiple de niños y "Toda la sala" exclusiva. Mateo seleccionado por defecto.
- ✅ TIPO: los 7 chips del mockup con sus colores, uno solo seleccionado, Comida por defecto.
- ✅ DESCRIPCIÓN obligatoria, vacía al abrir, con placeholder y mensaje de error en español.
- ✅ FOTOS: los dos tiles del mockup, **decorativos** (no hay selector de archivos).
- ✅ Catálogo de tipos: `PostType` pasa de 3 a 7 valores, con labels y estilos de badge para el feed.
- ❌ **No se crea ni persiste ninguna publicación.** "Publicar" valida y cierra. El array `posts` de `lib/posts.ts` no cambia y el feed no muestra un post nuevo.
- ❌ No se suben, previsualizan ni procesan imágenes.
- ❌ No hay borradores, autosave, confirmación de descarte ni toast de confirmación.
- ❌ No se agregan rutas (`/crear-publicacion`) ni query params (`?publicar=1`).
- ❌ No se toca `app/kid/[id]`, `/login` ni `/activate-account`.

## Reglas globales

Mismas que SPEC-01/02/03/04/05: Tailwind v4 100%, tokens `--color-*` del `@theme` de `app/globals.css`, valores arbitrarios con sintaxis bracket, Fredoka/Nunito ya cargadas con `next/font` (no se tocan), SVG inline como JSX, UI copy en español rioplatense tal cual el mockup, **código en inglés**, hrefs a rutas inexistentes como `#`.

**Patrón heredado de SPEC-04/05:** el `"use client"` va **solo** en el componente nuevo. `app/_components/sidebar.tsx` y `app/page.tsx` siguen siendo server components: se limitan a renderizar el componente cliente.

## Stack técnico

- Next.js 16.4.2 — App Router, `cacheComponents: true` (todo estático; el modal es cliente pero no hace fetching).
- React 19 + TypeScript.
- Tailwind CSS v4. Path alias `@/*`.

## Tokens

**`app/globals.css` no cambia.** Se reutilizan:

| Token        | Valor     | Uso en este modal                                                 |
| ------------ | --------- | ----------------------------------------------------------------- |
| `modal-bg`   | `#FBF4EC` | Fondo de la tarjeta (SPEC-04)                                     |
| `line`       | `#ECE0D0` | Borde de la tarjeta, divider del header, borde de chips inactivos |
| `card`       | `#FFFDF9` | Fondo de los chips inactivos                                      |
| `ink`        | `#3F362E` | Título del modal, fondo/borde del chip de destinatario activo     |
| `muted`      | `#A89A8B` | Texto "Compartí un momento…"                                      |
| `muted-dark` | `#94887B` | "Cancelar" y labels de sección                                    |
| `coral`      | `#F2937A` | Avatar "C" de la barra del feed                                   |
| `coral-dark` | `#D9583C` | "Publicar"                                                        |
| `coral-soft` | `#FBE3D8` | Fondo del botón-cámara de la barra del feed                       |
| `input-line` | `#EADFD0` | Borde del textarea                                                |
| `error`      | `#C5413A` | Texto de los mensajes de error (SPEC-04)                          |
| `error-line` | `#E8B0A6` | Borde del textarea inválido (SPEC-04)                             |

Quedan como bracket, igual que en los componentes existentes: `#6E6359` (texto de chip inactivo), `#B6A99B` (placeholder), `#F4ECE1` y `#CBB89F` (tile de foto), `#DBCDBA` (borde dashed del tile "Agregar"), `#B0A290` (texto "Agregar"), `#C5503A` (ícono `+`), `#F4977E`/`#EE8164` (gradiente del botón), `#E0654A` (cámara del feed) y las sombras `rgba(...)`.

La paleta de los 7 tipos **no** va a `@theme`: vive como strings de clases en `lib/posts.ts`, igual que `POST_TYPE_STYLES`.

## Modelo de datos

### `lib/posts.ts` (modificar)

```ts
export type PostType =
  | "meal" // Comida
  | "nap" // Siesta
  | "activity" // Actividad
  | "achievement" // Logro
  | "mood" // Ánimo
  | "photo" // Foto
  | "announcement"; // Anuncio

// Orden visual de los chips en el modal (el del mockup).
export const POST_TYPE_ORDER: PostType[];

// Labels del badge del feed (mayúsculas, como hoy).
export const POST_TYPE_LABELS: Record<PostType, string>;

// Labels de los chips del modal (capitalizados).
export const POST_TYPE_CHIP_LABELS: Record<PostType, string>;

// Estilos de los chips: base (inactivo) + variante seleccionada.
export const POST_TYPE_CHIP_STYLES: Record<
  PostType,
  { rest: string; selected: string }
>;
```

`POST_TYPE_LABELS` queda: `COMIDA`, `SIESTA`, `ACTIVIDAD`, `LOGRO`, `ÁNIMO`, `FOTO`, `ANUNCIO`.
`POST_TYPE_CHIP_LABELS` queda: `Comida`, `Siesta`, `Actividad`, `Logro`, `Ánimo`, `Foto`, `Anuncio`.

Colores de los chips:

| Tipo           | Inactivo (fondo / texto) | Seleccionado (fondo / texto) |
| -------------- | ------------------------ | ---------------------------- |
| `meal`         | `#F7E7A6` / `#9A7B1E`    | `#9A7B1E` / `#FFFFFF`        |
| `nap`          | `#E7DCF6` / `#7B5FC0`    | `#7B5FC0` / `#FFFFFF`        |
| `activity`     | `#C7E7F1` / `#2E89A6`    | `#2E89A6` / `#FFFFFF`        |
| `achievement`  | `#CFEBD8` / `#3E9B6C`    | `#3E9B6C` / `#FFFFFF`        |
| `mood`         | `#F9D2DE` / `#C56486`    | `#C56486` / `#FFFFFF`        |
| `photo`        | `#FBD8CC` / `#D9684A`    | `#D9684A` / `#FFFFFF`        |
| `announcement` | `#CCD8F4` / `#4E72C8`    | `#4E72C8` / `#FFFFFF`        |

El mockup muestra **solo** los estados: Comida y Actividad seleccionados (sólidos) y los otros cinco inactivos (pastel). Los pares faltantes se derivan por simetría: el sólido es el color de acento del tipo con texto blanco; el pastel de Comida es `#F7E7A6` (mismo amarillo suave que `PARENT_STATUS.pending`) y el de Actividad es `#C7E7F1` (el badge que ya existe).

`POST_TYPE_STYLES` (badge/avatar del feed) se completa para los 7 tipos:

| Tipo           | Avatar (fondo / texto) | Badge     | Punto y label |
| -------------- | ---------------------- | --------- | ------------- |
| `meal`         | `#F4DC8E` / `#9A7B1E`  | `#F7E7A6` | `#9A7B1E`     |
| `nap`          | `#C9B6E8` / `#7B5FC0`  | `#E7DCF6` | `#7B5FC0`     |
| `activity`     | `#A9D9E8` / `#1F7A93`  | `#C7E7F1` | `#2E89A6`     |
| `achievement`  | `#A9D9E8` / `#1F7A93`  | `#CFEBD8` | `#3E9B6C`     |
| `mood`         | `#F4B8CC` / `#C56486`  | `#F9D2DE` | `#C56486`     |
| `photo`        | `#FBD8CC` / `#D9684A`  | `#FBD8CC` | `#D9684A`     |
| `announcement` | `#CCD8F4` / `#4E72C8`  | `#CCD8F4` | `#4E72C8`     |

`posts` no se toca: sigue con los 3 posts actuales.

### Selección de destinatarios

```ts
// lib/children.ts — ya existe, no se modifica
const recipients = children.slice(0, 3); // Mateo, Sofía, Benjamín

// create-post-modal.tsx
type RecipientSelection =
  | { kind: "children"; childIds: string[] }
  | { kind: "room" };

const INITIAL_RECIPIENT: RecipientSelection = {
  kind: "children",
  childIds: [recipients[0].id], // Mateo, como el mockup
};
```

Unión discriminada en lugar de dos booleanos (`wholeRoom` + `selectedChildIds`): representa de una sola forma los estados válidos y hace imposible "sala + niños" al mismo tiempo.

## Archivos

### Crear

#### `app/_components/create-post-modal.tsx` (`"use client"`)

Export default `CreatePostModal`. Contiene **el disparador y el modal**: el estado `isOpen` vive acá, así que el botón tiene que ser parte del mismo árbol cliente.

```tsx
export default function CreatePostModal({
  variant,
}: {
  variant: "sidebar" | "feedBar";
})
```

**Estado del contenedor:** `isOpen: boolean`, `triggerRef`.

- Al abrir: `setIsOpen(true)`.
- `handleClose`: `setIsOpen(false)` y `triggerRef.current?.focus()`.
- Cuando `isOpen` es `true`, renderiza `<CreatePostDialog onClose={handleClose} />`. El diálogo se **monta recién ahí**, así que al cerrar se desmonta y el formulario se resetea solo (destinatario Mateo, tipo Comida, descripción vacía, sin errores).

`CreatePostDialog` y `CreatePostTrigger` se definen en el mismo archivo y **no** se exportan.

**Disparador `variant="sidebar"`** — reemplaza el `<Link href="#">` actual de `sidebar.tsx` con las mismas clases, incluido el `mb-[18px]`:

`mb-[18px] flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]`

Ícono `+` inline (17px, `stroke="#fff"`, `strokeWidth 2.4`) + texto "Nueva publicación".

**Disparador `variant="feedBar"`** — reemplaza el `<a href="#">` de `app/page.tsx` con las mismas clases, incluido el `mb-6`:

`mb-6 flex w-full cursor-pointer items-center gap-[14px] rounded-[18px] border border-line bg-card px-[18px] py-[14px] text-left shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)]`

Contenido idéntico al actual: avatar "C" (40px, `bg-coral`, Fredoka 600 16px blanco), `<span className="flex-1 text-[15px] text-muted">Compartí un momento…</span>` y el recuadro de 38px `rounded-[12px] bg-coral-soft text-[#E0654A]` con el SVG de cámara de 19px.

Ambos disparadores son `<button type="button">` con `ref={triggerRef}` y `onClick`: ya no navegan.

**Overlay** — `fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(63,54,46,.45)] p-6`.

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="create-post-title"`.
- Click en el overlay (no en la tarjeta) → `onClose()`.

**Tarjeta** — `w-full max-w-[580px] overflow-hidden rounded-[24px] border border-line bg-modal-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]`.

**Header** — `flex items-center justify-between border-b border-line px-[26px] py-[20px]`:

- "Cancelar" → `<button type="button">` `cursor-pointer text-[15px] font-bold text-muted-dark` → `onClose()`.
- "Nueva publicación" → `<span id="create-post-title">` `font-fredoka text-[18px] font-semibold text-ink`.
- "Publicar" → `<button type="submit" form="create-post-form">` `cursor-pointer text-[15px] font-extrabold text-coral-dark`.

No hay botón "X": el mockup no lo tiene y "Cancelar" cumple esa función.

**Body** — `<form id="create-post-form" noValidate onSubmit={handleSubmit}>` con `px-[26px] py-[24px]`.

El `form` del header está fuera del `<form>`, así que "Publicar" se asocia con el atributo `form` (mismo criterio que SPEC-04).

**Label de sección** (PARA, TIPO, DESCRIPCIÓN, FOTOS): `mb-[10px] text-[12px] font-extrabold tracking-[.7px] text-muted-dark`.

##### PARA

Fila `flex flex-wrap gap-[9px]` dentro de un contenedor `mb-[22px]`, envuelta en `role="group" aria-labelledby="create-post-recipients-label"`.

Cada niño es un chip de **checkbox** (selección múltiple):

- `<label className="relative">` con `<input type="checkbox" name="create-post-recipients" id={"create-post-recipient-" + child.id} className="peer absolute size-0 opacity-0">` (fuera del flujo, como en SPEC-05).
- `<span>`: `flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-line bg-card py-[6px] pr-[14px] pl-[6px] text-[14px] font-bold text-[#6E6359] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink`.
- Avatar 26px: `font-fredoka flex size-[26px] flex-none items-center justify-center rounded-full text-[13px] font-semibold` + `AVATAR_TONES[child.tone]` (ya existe en `lib/children.ts`).
- Texto: primer nombre (`child.name.split(" ")[0]`).

"Toda la sala" es otro chip, sin avatar: mismo `<label>` + input oculto (`id="create-post-recipient-room"`) y `<span>` con `px-4 py-[6px]` y los mismos estados.

Reglas de selección:

- Mateo arranca marcado (`INITIAL_RECIPIENT`).
- Marcar/desmarcar un niño con `kind: "children"` agrega/quita su id.
- Si está `kind: "room"` y se marca un niño → pasa a `{ kind: "children", childIds: [id] }` (la sala se deselecciona).
- Marcar "Toda la sala" → `{ kind: "room" }` y se desmarcan todos los niños.
- Desmarcar "Toda la sala" → `{ kind: "children", childIds: [] }` (ningún destinatario, estado inválido hasta que elija).
- Los chips de niño se ven con sus colores reales de avatar; el estado seleccionado lo da el fondo `ink`.

##### TIPO

Fila `flex flex-wrap gap-[9px]` dentro de un contenedor `mb-[22px]`, con `role="radiogroup" aria-labelledby="create-post-type-label"`.

- 7 chips en el orden de `POST_TYPE_ORDER`, cada uno: `<label className="relative">` + `<input type="radio" name="create-post-type" value={type} checked={type === selected} onChange={...} className="peer absolute size-0 opacity-0">` + `<span>` con:
  - base `cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-extrabold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink`
  - `POST_TYPE_CHIP_STYLES[type].rest`
  - `POST_TYPE_CHIP_STYLES[type].selected`
- El tipo seleccionado usa su variante sólida; los demás, su pastel. Como en el mockup, los chips de tipo **no** llevan borde.
- `selectedType` arranca en `"meal"` (Comida sólida) y siempre hay exactamente uno.

##### DESCRIPCIÓN

`<textarea>` **no controlado** (`ref={descriptionRef}`, sin `value`), vacío al abrir:

`mb-[22px] min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-[15px] leading-[1.5] text-ink placeholder:text-[#B6A99B] focus:outline-none`

- `id="create-post-description"`, `name="description"`, `required`, `placeholder="Contá cómo le fue hoy…"`.
- Borde `border-input-line` o `border-error-line` (se **elige**, no se apilan).
- Con error: `aria-invalid="true"` y `aria-describedby="create-post-description-error"`.

##### FOTOS

Fila `flex gap-3` (último bloque, sin margen inferior). Ambos tiles son **decorativos** y no interactivos:

- Tile 1: `<div aria-hidden="true">` `flex size-24 items-center justify-center rounded-[14px] border border-line bg-[#F4ECE1] text-[#CBB89F]` + SVG de imagen 26px (`stroke="currentColor"`, `strokeWidth 1.7`).
- Tile 2: `<div aria-hidden="true">` `flex size-24 flex-col items-center justify-center gap-[6px] rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]` + SVG `+` 22px (`stroke="#C5503A"`, `strokeWidth 2`) + `<span className="text-[12px]">Agregar</span>`.

No hay `<input type="file">`, ni estado de fotos, ni `cursor-pointer`: el texto "Agregar" queda visible por fidelidad al mockup, pero fuera del orden de tabulación (es un `div`, no un botón).

##### Validación

Estado `recipientsError: string | null` y `descriptionError: string | null`.

- Destinatarios: `kind === "children" && childIds.length === 0` → "Elegí al menos un destinatario". Mensaje `role="alert"` `mt-[8px] text-[13px] font-bold text-error` debajo de los chips; el grupo queda con `aria-describedby="create-post-recipients-error"`.
- Descripción: `trim()` vacío → "Escribí la descripción de la publicación". El textarea se marca con `border-error-line`, `aria-invalid` y `aria-describedby`.
- "Publicar" **no** se deshabilita (`noValidate` + validación propia). Con errores el modal **permanece abierto**, se muestra el mensaje y el foco va al primer campo inválido: el checkbox de Mateo si fallan los destinatarios, el textarea si solo falla la descripción.
- El error de destinatarios se limpia apenas se selecciona cualquier chip. El de descripción se recalcula en cada `onChange` solo si ya había fallado.
- Con datos válidos: `onClose()`. No se crea nada, no hay toast.

##### Accesibilidad y ciclo de vida

- Al montar el diálogo: foco en el textarea de descripción (`descriptionRef.current?.focus()`), que es el campo donde se escribe.
- Escape cierra. Click en el overlay cierra. "Cancelar" cierra.
- Tab cicla solo dentro de la tarjeta. La trampa se calcula en cada `keydown` con un query al `cardRef` (`button, input, textarea, select, a[href]`), descartando `disabled`, elementos sin layout y **radios no marcados**, porque el navegador expone un solo tab stop por grupo de radios. Orden real: Cancelar → Publicar → 4 checkboxes de PARA → radio marcado de TIPO → textarea (8 tab stops).
- Al cerrar, el foco vuelve al disparador (sidebar o barra del feed, según la instancia).
- Mientras está abierto se agrega `modal-open` a `document.body`; al cerrar o desmontar se quita. La regla `body.modal-open, body.modal-open main { overflow: hidden }` de SPEC-04 ya cubre `/` y `/kid`, donde el contenedor scrolleable es `main`.

### Modificar

#### `app/_components/sidebar.tsx`

- Importar `CreatePostModal` de `@/app/_components/create-post-modal`.
- Reemplazar el `<Link href="#" ...>Nueva publicación</Link>` por `<CreatePostModal variant="sidebar" />`. El resto del sidebar no cambia y sigue siendo server component.

#### `app/page.tsx`

- Importar `CreatePostModal`.
- Reemplazar la tarjeta `<a href="#" ...>Compartí un momento…</a>` por `<CreatePostModal variant="feedBar" />`. El resto de la página no cambia y sigue siendo server component.

#### `lib/posts.ts`

- Extender `PostType` a 7 valores y agregar `POST_TYPE_ORDER`, `POST_TYPE_CHIP_LABELS` y `POST_TYPE_CHIP_STYLES`.
- Completar `POST_TYPE_LABELS` y `POST_TYPE_STYLES` para los 7 tipos.
- No tocar `Post`, `PostPhoto` ni el array `posts`.

`app/_components/post-card.tsx` no cambia: ya lee los tres mapas.

## Plan de implementación

1. Extender `lib/posts.ts` (7 tipos + `POST_TYPE_ORDER` + labels + estilos de badge + `POST_TYPE_CHIP_STYLES`). Verificación: `npx tsc --noEmit` sin errores y `/` muestra los mismos 3 posts con los mismos badges.
2. Crear `app/_components/create-post-modal.tsx` con `"use client"`, los dos disparadores y el esqueleto del diálogo (overlay + tarjeta + header con Cancelar/Publicar + form vacío). Verificación: `npx tsc --noEmit` sin errores.
3. Cablear el disparador del sidebar. Verificación: en `/` y `/kid`, "Nueva publicación" abre y cierra el modal con Cancelar, Escape y click en el fondo.
4. Implementar PARA: chips desde `children.slice(0, 3)`, checkboxes ocultos, selección múltiple, exclusividad de "Toda la sala" y defaults. Verificación manual de las cuatro combinaciones (marcar niño, desmarcar el último, marcar sala, desmarcar sala).
5. Implementar TIPO: radios ocultos, 7 chips con `POST_TYPE_CHIP_STYLES`, Comida por defecto y navegación con flechas. Verificación: un solo chip sólido a la vez.
6. Implementar DESCRIPCIÓN (textarea no controlado) y FOTOS (tiles decorativos). Verificación: el modal coincide con el mockup y el tabulador no se detiene en "Agregar".
7. Agregar la validación de destinatarios y descripción. Verificación manual: publicar sin texto, sin destinatarios y con ambos válidos.
8. Agregar accesibilidad: foco inicial, Escape, trampa de foco filtrada, retorno de foco y `modal-open`. Verificación en `/` y `/kid`.
9. Cablear el disparador del feed. Verificación: en `/`, la barra "Compartí un momento…" abre el mismo modal y no navega; el sidebar sigue funcionando.
10. Verificación visual: copia temporal del mockup en `public/_mockups/`, comparación 1:1 con Playwright (`getBoundingClientRect` + `getComputedStyle`) y capturas en `.playwright-mcp/`. Cierre: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Checklist de aceptación

Modal y disparadores:

- [x] En `/`, el botón "Nueva publicación" del sidebar abre el modal sobre la página, con overlay `rgba(63,54,46,.45)` y el feed visible detrás.
- [x] En `/kid`, el mismo botón del sidebar abre el mismo modal; no se modifica ninguna página de niños.
- [x] En `/`, la barra "Compartí un momento…" abre el mismo modal y no navega.
- [x] Ambos disparadores son `<button type="button">` y conservan exactamente el aspecto previo (gradiente, íconos, márgenes `mb-[18px]` y `mb-6`).
- [x] La tarjeta coincide 1:1 con el mockup: `max-width 580px`, radio 24px, fondo `#FBF4EC`, borde 1px `#ECE0D0`, sombra `0 20px 50px -24px rgba(63,54,46,.35)`.
- [x] Header con "Cancelar" (15px, bold, `#94887B`), "Nueva publicación" (Fredoka 600, 18px, `#3F362E`) y "Publicar" (15px, extrabold, `#D9583C`), separados por un divider 1px `#ECE0D0`.
- [x] No hay botón "X" (no está en el mockup).

PARA:

- [x] Se muestran 3 chips: Mateo, Sofía y Benjamín, con sus avatares y colores de `lib/children.ts` (26px, letra Fredoka 600 13px).
- [x] Se muestra el chip "Toda la sala" sin avatar.
- [x] Mateo arranca seleccionado: borde y fondo `#3F362E`, texto blanco.
- [x] Los chips inactivos tienen borde `#ECE0D0`, fondo `#FFFDF9` y texto `#6E6359`.
- [x] Se pueden marcar varios niños a la vez y cada uno se desmarca con otro click.
- [x] Marcar "Toda la sala" desmarca todos los niños; marcar un niño después desmarca "Toda la sala".
- [x] Desmarcar todos y presionar "Publicar" deja el modal abierto y muestra "Elegí al menos un destinatario".
- [x] Elegir cualquier destinatario hace desaparecer ese error.

TIPO:

- [x] Se muestran los 7 chips en el orden Comida, Siesta, Actividad, Logro, Ánimo, Foto, Anuncio.
- [x] Comida arranca seleccionado con fondo `#9A7B1E` y texto blanco; los otros seis usan su pastel y su acento según la tabla.
- [x] Al elegir otro tipo, el anterior vuelve a su pastel y queda exactamente un chip sólido.
- [x] Los chips de tipo no tienen borde y miden 8px/16px de padding con texto 13.5px/800.
- [x] El grupo se recorre con las flechas del teclado y expone un solo tab stop.

DESCRIPCIÓN y FOTOS:

- [x] El textarea abre vacío, con placeholder "Contá cómo le fue hoy…", `min-height 120px`, `resize: vertical`, borde `#EADFD0` y radio 14px.
- [x] "Publicar" con el textarea vacío o solo espacios deja el modal abierto, muestra "Escribí la descripción de la publicación" y marca el textarea con borde `#E8B0A6` y `aria-invalid`.
- [x] El error desaparece al escribir texto.
- [x] FOTOS muestra dos tiles de 96×96 con los colores del mockup (imagen `#CBB89F`; "Agregar" dashed `#DBCDBA`, `+` `#C5503A`, texto 12px `#B0A290`).
- [x] "Agregar" no abre ningún selector, no responde al click y no recibe foco con Tab.

Comportamiento y datos:

- [x] "Publicar" con destinatario, tipo y descripción válidos cierra el modal.
- [x] Después de publicar, el feed sigue mostrando exactamente los mismos 3 posts; no aparece ninguna publicación nueva.
- [x] `posts` en `lib/posts.ts` no cambia y no se escribe nada en `localStorage`, `sessionStorage` ni cookies.
- [x] "Cancelar", Escape y click en el overlay cierran el modal sin validar ni publicar.
- [x] Al reabrir, el formulario vuelve al estado inicial: Mateo seleccionado, Comida seleccionado, descripción vacía y sin errores.
- [x] Al abrir, el foco está en el textarea de descripción.
- [x] Con el modal abierto, Tab y Shift+Tab no salen de la tarjeta.
- [x] Al cerrar, el foco vuelve al disparador que abrió el modal.
- [x] Con el modal abierto la página de fondo no scrollea; al cerrar conserva la posición de scroll.
- [x] El diálogo tiene `role="dialog"`, `aria-modal="true"` y `aria-labelledby="create-post-title"`; los chips tienen inputs reales asociados a su `<label>`.

Arquitectura y convenciones:

- [x] `app/_components/create-post-modal.tsx` es el único archivo nuevo con `"use client"`; `sidebar.tsx` y `app/page.tsx` siguen sin directiva de cliente.
- [x] Cero estilos inline: todo vía clases Tailwind y los tokens existentes.
- [x] `app/globals.css` no cambia: se reutilizan `modal-bg`, `input-line`, `error`, `error-line` y la regla `body.modal-open`.
- [x] `PostType` tiene 7 valores y `POST_TYPE_LABELS`, `POST_TYPE_CHIP_LABELS` y `POST_TYPE_STYLES` son `Record<PostType, ...>` completos (el compilador lo exige).
- [x] `post-card.tsx` no cambia y sigue renderizando los badges de los 3 posts actuales.
- [x] `/`, `/kid`, `/kid/[id]`, `/login` y `/activate-account` se ven y responden igual que antes, salvo los dos disparadores convertidos en botones.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Decisiones

- **Sí:** solo visual. "Publicar" valida y cierra sin crear el post, igual que SPEC-04/05. El proyecto no tiene backend ni persistencia y agregar estado al feed obligaría a convertir `/` en cliente y a inventar una fuente de datos paralela.
- **Sí:** extender `PostType` a 7 valores aunque no se creen posts nuevos. Deja el catálogo listo y hace que el modal use el mismo vocabulario que el feed en vez de duplicar tipos en un archivo aparte.
- **Sí:** `POST_TYPE_CHIP_STYLES` y los estilos de badge viven en `lib/posts.ts`. Es el mismo lugar donde ya viven `POST_TYPE_LABELS` y `POST_TYPE_STYLES`, y mantiene los tres mapas sincronizados por tipo.
- **Sí:** los pares de color faltantes se derivan por simetría (sólido = acento del tipo + texto blanco). El mockup solo muestra dos estados seleccionados; inventar una paleta nueva rompería la coherencia con los badges existentes.
- **Sí:** los chips de PARA salen de `children.slice(0, 3)`. Reproduce el mockup con datos reales, sin nombres duplicados en el componente.
- **Sí:** selección múltiple de niños y "Toda la sala" exclusiva. Es la única combinación que evita una audiencia ambigua del tipo "la sala entera y también Mateo".
- **Sí:** Mateo y Comida arrancan seleccionados, como el mockup. La descripción arranca vacía porque el texto del mockup es un ejemplo, no un borrador real.
- **Sí:** checkboxes y radios nativos ocultos (`peer absolute size-0 opacity-0` + `peer-checked:`), igual que SPEC-05. Aportan semántica, foco y teclado sin romper la maqueta.
- **Sí:** la variante del disparador es una prop (`variant: "sidebar" | "feedBar"`). El estado `isOpen` obliga a que el trigger viva dentro del componente cliente; una prop evita duplicar el modal en dos archivos.
- **Sí:** el diálogo se monta solo cuando `isOpen` es `true`. Garantiza el reset del formulario al cerrar (destinatarios, tipo, errores y textarea) sin lógica manual de limpieza.
- **Sí:** foco inicial en el textarea de descripción. Es el campo donde se escribe; los destinatarios y el tipo ya vienen elegidos.
- **Sí:** `role="group"` y `role="radiogroup"` con `aria-labelledby` sobre los labels "PARA" y "TIPO", en lugar de `<fieldset>`/`<legend>`, que rompería el layout del mockup.
- **Sí:** los tiles de FOTOS son `<div aria-hidden>` y no botones deshabilitados. Si son decorativos, no deben existir como controles ni aparecer en la trampa de foco.
- **Sí:** la trampa de foco filtra los radios no marcados además de los `disabled`. Sin ese filtro, el primer y el último elemento reales del modal se calcularían mal.
- **No:** persistencia en `localStorage`, contexto global o API. Es otra spec y hoy no hay backend.
- **No:** `input type="file"` ni previews de imagen. Se decidió que FOTOS sea decorativo.
- **No:** borradores, autosave o confirmación de descarte. El mockup no los muestra y agregarían estados que nadie pidió.
- **No:** ruta `/crear-publicacion` o query param. El pedido es un modal y una ruta rompe el patrón "todo estático".
- **No:** tocar `globals.css`. Todos los colores ya existen como token o como bracket en componentes vecinos; agregar tokens de un solo uso engorda `@theme` sin ganancia.
- **No:** reutilizar `--color-auth-link` para el `+` de "Agregar" aunque sea el mismo `#C5503A`: es un token del dominio de auth (mismo criterio que SPEC-04 con `auth-bg`).
- **No:** deshabilitar "Publicar" cuando faltan datos. Un botón muerto no explica qué falta.
- **No:** extraer un hook compartido de modal con SPEC-04/05. Ambas están implementadas y verificadas; refactorizarlas es otra spec.

## Riesgos

| Riesgo                                                                      | Mitigación                                                                                                             |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tailwind no genera las clases de color de cada tipo si se arman en runtime  | Los strings completos viven literales en `POST_TYPE_CHIP_STYLES` y `POST_TYPE_STYLES`; el scanner los encuentra.        |
| Extender `PostType` rompe la exhaustividad de los `Record`                  | Actualizar `POST_TYPE_LABELS`, `POST_TYPE_CHIP_LABELS` y `POST_TYPE_STYLES` en el mismo paso; `tsc` lo exige.            |
| `bg` base y `peer-checked:bg` compiten en el mismo chip                     | Las utilidades con variante se emiten después de las base; el estado seleccionado gana. Se verifica en el screenshot 1:1. |
| Dos instancias del modal conviven en `/`                                    | Cada una tiene su propio `isOpen` y su propio `triggerRef`; el overlay tapa la página, así que no se pueden abrir las dos. |
| La trampa de foco incluye radios ocultos no marcados                        | El query descarta `disabled` y `input[type=radio]:not(:checked)` antes de calcular primero/último.                       |
| El primer y el último elemento del modal están en el header                 | El query corre sobre la tarjeta completa, no solo sobre el `<form>`; incluye Cancelar y Publicar.                       |
| Bloquear solo `body` no frena el scroll                                      | Se reutiliza `body.modal-open main { overflow: hidden }` de SPEC-04; en `/` y `/kid` el scroll vive en `main`.          |
| React 19: warning de input controlado sin `onChange`                        | Los chips son controlados con `onChange` y el textarea es no controlado (`ref`, sin `value`).                            |
| La tarjeta (≈600px) puede exceder el viewport en pantallas bajas            | El overlay es `overflow-y-auto` con `p-6`; la tarjeta scrollea dentro del overlay sin mover la página.                   |
| El comentario de `body.modal-open` menciona solo el modal de niño           | El selector es genérico y no se duplica; el comentario se deja como está para no tocar CSS verificado.                  |

## Qué **no** está en este spec

- Crear, guardar o persistir publicaciones; que el post aparezca en el feed.
- Subir imágenes, selector de archivos o previews de fotos.
- Borradores, autosave, confirmación de descarte o toast de "publicado".
- Edición de publicaciones existentes (`detalle-publicacion.dc.html`, `post-card.tsx`).
- Filtros por tipo o por niño en el feed.
- Avisos (`avisos.dc.html`), mi cuenta (`mi-cuenta.dc.html`) y feed de familia.
- Ruta `crear-publicacion` o query param.
- Responsive: el diseño de referencia es desktop (mobile queda para una spec aparte).
- Refactor de SPEC-04/05 para compartir el hook de modal.
