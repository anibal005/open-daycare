# SPEC-01 — Feed como Home (`/`)

| Campo            | Valor                                             |
| ---------------- | ------------------------------------------------- |
| **Feature**      | Home = Feed de publicaciones (Sala Soles)         |
| **Rama**         | `feat/spec-01-feed-home`                          |
| **Estado**       | `Aprovado`                         |
| **Fuente**       | `references/pantallas/feed.dc.html`               |
| **Referencia**   | `references/screenshots/feed.png`                 |

## Descripción

Implementar la plantilla `feed.dc.html` como página principal (`app/page.tsx`, ruta `/`) de la aplicación OpenDayCare.

**Alcance SOLO visual:**

- ❌ NO hay autenticación.
- ❌ NO hay base de datos ni fetching de datos.
- ❌ NO se crean rutas adicionales (`/ninos`, `/avisos`, `/crear-publicacion`, etc.).
- ✅ Sí datos mock en un módulo TypeScript local.
- ✅ El resultado debe lucir **idéntico** al mockup (colores, tipografías, espaciados, sombras, radios).

## Reglas globales

1. Estilo 100% con **Tailwind CSS v4** (ya instalado vía `@tailwindcss/turbopack`). Sin CSS modules, sin styled-components, sin configuración v3.
2. Los colores del mockup se registran como tokens en `@theme` dentro de `app/globals.css` y se usan como clases semánticas (`bg-cream`, `text-ink`, `border-line`…).
3. Los valores arbitrarios (radios 18px/20px, tamaños 14.5px, sombras) se escriben con sintaxis bracket de Tailwind (`rounded-[20px]`, `text-[14.5px]`) para fidelidad exacta.
4. Fuentes **Fredoka** y **Nunito** vía `next/font/google` (NO `<link>` a Google Fonts). Se exponen como variables `--font-fredoka` / `--font-nunito` y tokens `font-fredoka` / `font-nunito`.
5. Diseño solo claro: se elimina el bloque `prefers-color-scheme: dark` de `globals.css`.
6. Los SVG del mockup se copian **inline** como componentes JSX (sin librería de iconos).
7. `lang="es"` en `<html>`; metadata: título `OpenDayCare · Sala Soles`.
8. Todos los enlaces del mockup que apuntan a rutas inexistentes quedan como `href="#"`.
9. UI copy en español rioplatense tal cual el mockup ("Compartí un momento…", "Buenas, Caro").
10. **Código en inglés**: nombres de variables, funciones, componentes, tipos, props y constantes en inglés (regla global del proyecto). El español es solo para el texto visible en pantalla.

## Stack técnico

- Next.js 16.4.2 — App Router, `cacheComponents: true` (todo estático, sin data fetching, no aplica Suspense).
- React 19 + TypeScript.
- Tailwind CSS v4 (Turbopack loader, sin PostCSS config).
- Path alias `@/*` → raíz del repo.

## Tokens de color (globales)

| Token        | Valor     | Uso                                  |
| ------------ | --------- | ------------------------------------ |
| `cream`      | `#F6ECDF` | Fondo de página                      |
| `card`       | `#FFFDF9` | Fondo de tarjetas y sidebar          |
| `line`       | `#ECE0D0` | Bordes suaves                        |
| `line-soft`  | `#F0E6D8` | Borde interno del footer de posts    |
| `ink`        | `#3F362E` | Texto principal                      |
| `body-ink`   | `#4A4038` | Texto de los posts                   |
| `muted`      | `#A89A8B` | Texto secundario                     |
| `muted-dark` | `#94887B` | Texto terciario / meta               |
| `coral`      | `#F2937A` | Botones y avatares principales       |
| `coral-dark` | `#D9583C` | Acento activo / etiquetas            |
| `coral-soft` | `#FBE3D8` | Fondo de item nav activo / iconos    |
| `coral-btn`  | `#EE8164` | Gradiente del botón Nueva publicación |

Variantes de badges de post (fondo / punto / texto):

| Tipo        | Avatar fondo / texto     | Badge fondo / acento |
| ----------- | ------------------------ | -------------------- |
| `achievement` | `#A9D9E8` / `#1F7A93`    | `#CFEBD8` / `#3E9B6C` |
| `activity`    | `#A9D9E8` / `#1F7A93`    | `#C7E7F1` / `#2E89A6` |
| `announcement`| `#CCD8F4` / `#4E72C8`    | `#CCD8F4` / `#4E72C8` |

## Archivos

### Modificar

#### `app/globals.css`

- Mantener `@import "tailwindcss";`.
- Reemplazar `:root` / `@theme inline` / `@media (prefers-color-scheme: dark)` por un bloque `@theme` con:
  - Los tokens de la tabla anterior (`--color-*`).
  - `--font-fredoka` y `--font-nunito` (consumiendo las variables de `next/font`).
- `body { background: var(--color-cream); color: var(--color-ink); font-family: var(--font-nunito); -webkit-font-smoothing: antialiased; }`.
- Portear los estilos globales del mockup: `*{box-sizing:border-box}`, reset de márgenes, estilo del scrollbar webkit (thumb `#E4D6C4`, radius 8px).

#### `app/layout.tsx`

- Eliminar `Geist` y `Geist_Mono`; importar `Fredoka` (weights 400–700) y `Nunito` (weights 400–800, itálica 400) de `next/font/google` con variables `--font-fredoka` / `--font-nunito` y subsets `latin`.
- `<html lang="es">` con las clases de ambas variables + `h-full antialiased`.
- Metadata: `title: "OpenDayCare · Sala Soles"`, `description` en español (feed de la guardería).
- `body`: `min-h-full` (quitar `flex flex-col` que sobra).

#### `app/page.tsx`

- Reemplazar **todo** el contenido de la plantilla create-next-app.
- Estructura:
  - `<div className="flex min-h-screen bg-cream">`
    - `<Sidebar />` (aside de 248px).
    - `<main className="h-screen flex-1 min-w-0 overflow-y-auto">` con contenedor `max-w-[760px] mx-auto px-10 pt-[34px] pb-20`.
      - Encabezado: eyebrow `GUARDERÍA · SALA SOLES` (12.5px, 800, tracking .8px, `text-coral-dark`), `h1` "Buenas, Caro" (Fredoka 600, 30px), párrafo "12 niños · martes 17 jun" (14.5px, `text-muted-dark`).
      - Tarjeta CTA "Compartí un momento…" (link a `#`): avatar C, texto placeholder, botón-camera con fondo `coral-soft`.
      - Separador "PUBLICADO HOY" con línea `#E7DAC8`.
      - `<div className="flex flex-col gap-4">` con `.map()` sobre los posts mock renderizando `<PostCard />`.

### Crear

#### `lib/posts.ts`

- Tipo `Post`:
  ```ts
  // Internal identifiers in English; Spanish labels are display-only.
  type PostType = "achievement" | "activity" | "announcement";

  interface Post {
    id: string;
    type: PostType;
    childName: string;      // "Mateo"
    avatarLetter: string;   // "M"
    time: string;           // "14:20"
    authorLabel: string;    // "publicado por vos"
    audience: string;       // "Para: familia de Mateo" | "Para: toda la sala"
    text: string;           // cuerpo del post
    likes: number;
    comments: number;
    photo?: { alt: string; caption: string }; // solo activity
  }
  ```
- Export `const posts: Post[]` con los 3 posts del mockup (`achievement` 14:20 con 3 likes/1 comentario; `activity` 09:40 con foto "pintando con témperas", 5 likes/2 comentarios; `announcement` 07:50 "Para: toda la sala", 8 likes/0 comentarios).
- Export el mapa de estilos por tipo (`POST_TYPE_STYLES`) con clave `PostType` en inglés, y además el **label visible** en español para cada tipo (`achievement` → `LOGRO`, `activity` → `ACTIVIDAD`, `announcement` → `ANUNCIO`), p. ej.:
  ```ts
  const POST_TYPE_LABELS: Record<PostType, string> = {
    achievement: "LOGRO",
    activity: "ACTIVIDAD",
    announcement: "ANUNCIO",
  };
  ```
- Los colores de avatar/badge por tipo siguen la tabla de arriba, solo que las claves pasan a `achievement` / `activity` / `announcement`.

#### `app/_components/sidebar.tsx`

Componente `Sidebar` (server component, sin props). Aside sticky:

- `w-[248px] flex-none bg-card border-r border-line flex flex-col px-4 py-6 sticky top-0 h-screen`.
- **Logo**: div 38×38 `rounded-[12px]` con gradiente `linear-gradient(155deg,#F8C3A8,#F2937A)` + SVG sol inline; texto "OpenDayCare" (Fredoka 600, 17px) + "Sala Soles" (11.5px, muted).
- **Botón Nueva publicación**: link a `#`, `w-full p-3 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] text-white font-extrabold text-[14.5px] shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]`, icono `+` inline, `mb-[18px]`.
- **Nav** (`flex flex-col gap-1 flex-1`), 4 links con SVG inline (19px), `flex items-center gap-3 px-3 py-[11px] rounded-[12px] text-[14.5px]`:
  - Feed — activo: `bg-coral-soft text-coral-dark font-extrabold` (icono casa).
  - Niños — `text-[#6E6359] font-semibold` (icono dos personas).
  - Avisos — idem (icono campana).
  - Mi cuenta — idem (icono usuario).
- **Footer usuario**: `border-t border-line pt-[14px] mt-[10px]`; avatar circle 38px `bg-coral text-white font-fredoka` con "C"; "Caro Giménez" (800, 14px) + "Maestra · Soles" (12px, muted); botón logout 32×32 `rounded-[10px] bg-cream text-[#94887B]` con icono de salida, link a `#`.

#### `app/_components/post-card.tsx`

Props: `{ post: Post }`. Article:

- `rounded-[20px] border border-line bg-card p-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,.5)]`.
- **Header** (`flex items-center gap-3 mb-[14px]`):
  - Avatar 44px: circle con letra (Fredoka 600, 17px) o —para `announcement`— `rounded-[14px]`… *(ojo: en el mockup el avatar del anuncio es cuadrado redondeado con icono megáfono; `achievement`/`activity` son circulares con letra)*.
  - Nombre (Fredoka 600, 16.5px) + meta `{time} · {authorLabel}` (12.5px, muted).
  - Badge tipo: `flex items-center gap-[7px] px-3 py-[6px] rounded-full` con punto de 8px + label en mayúsculas (12px, 800, tracking .5px) tomado de `POST_TYPE_LABELS` (`LOGRO` / `ACTIVIDAD` / `ANUNCIO`) — el valor interno es el `PostType` en inglés, el label es solo visual.
- **Audiencia**: `text-[12.5px] text-muted mb-[10px]`.
- **Cuerpo**: `text-[15.5px] leading-[1.55] text-body-ink`.
- **Foto** (si `post.photo`): link a `#`, `flex flex-col items-center justify-center gap-2 mt-[14px] h-[200px] rounded-[16px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]` con SVG inline de imagen (30px) + caption "Foto · pintando con témperas".
- **Footer** (`flex items-center gap-[18px] mt-4 pt-[14px] border-t border-line-soft`):
  - Likes: span con SVG corazón **relleno** `#E0654A` + count, `text-[#E0654A] font-bold text-[14px]`.
  - Comentarios: link a `#` con SVG burbuja + count, `text-[#94887B] font-bold text-[14px]`.
  - `<span className="flex-1" />`.
  - "Editar": link a `#`, `text-[#C5503A] font-extrabold text-[14px]`.

## Checklist de aceptación

- [x] `/` renderiza el feed idéntico a `references/pantallas/feed.dc.html` (comparar con captura Playwright en `.playwright-mcp/` vs `references/screenshots/feed.png`).
- [x] Fuentes Fredoka/Nunito cargadas con `next/font` (sin `<link>` externo visible en el HTML final).
- [x] Cero estilos inline heredados del mockup: todo vía clases Tailwind (los únicos `style` permitidos serían gradiente con comillas problemáticas, preferir clases `bg-gradient-to-*`).
- [x] Sidebar sticky con scroll independiente del `main`.
- [x] `npm run lint` sin errores.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npm run build` compila.
- [x] Ningún enlace roto: todos los hrefs son `#`.

## Fuera de alcance (specs futuros)

- Rutas: `/ninos`, `/avisos`, `/mi-cuenta`, `/crear-publicacion`, `/detalle-publicacion`, `/foto`, `/login`.
- Autenticación y el botón de logout real.
- Base de datos / datos reales de posts y niños.
- Responsive del mockup (el diseño de referencia es desktop; mobile queda para un spec aparte).
