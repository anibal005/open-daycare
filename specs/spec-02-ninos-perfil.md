# SPEC-02 — Rutas `/kid` y `/kid/[id]` (lista y perfil de niños)

| Campo          | Valor                                                 |
| -------------- | ----------------------------------------------------- |
| **Feature**    | Pantallas de gestión de niños: lista y perfil         |
| **Rama**       | `feat/spec-02-ninos-perfil`                           |
| **Estado**     | `Implemented`                                            |
| **Fuente**     | `references/pantallas/ninos.dc.html`                  |
|                | `references/pantallas/perfil-nino.dc.html`            |
| **Referencia** | `references/screenshots/ninos.png`                    |

## Descripción

Implementar las plantillas `ninos.dc.html` (lista) y `perfil-nino.dc.html` (detalle) como rutas `/kid` (`app/kid/page.tsx`) y `/kid/[id]` (`app/kid/[id]/page.tsx`) de la aplicación OpenDayCare.

**Alcance SOLO visual:**

- ❌ NO hay autenticación.
- ❌ NO hay base de datos ni fetching de datos.
- ❌ NO se crean rutas adicionales (`/agregar-nino`, `/resumen-dia`, `/vincular-padre`, `/avisos`, `/mi-cuenta`).
- ✅ Sí datos mock en un módulo TypeScript local (`lib/children.ts`).
- ✅ El resultado debe lucir **idéntico** a los mockups (colores, tipografías, espaciados, sombras, radios).
- ✅ Sí navegación real entre las pantallas de este spec: lista → perfil → lista, y el item "Niños" activo en el Sidebar.

## Reglas globales

Mismas que SPEC-01 (`specs/spec-01-feed-home.md`), reforzadas:

1. Estilo 100% con **Tailwind CSS v4** (vía `@tailwindcss/turbopack`). Sin CSS modules, sin styled-components, sin config v3.
2. Los colores nuevos se registran como tokens `--color-*` en el bloque `@theme` de `app/globals.css` y se usan como clases semánticas.
3. Valores arbitrarios (radios 18px, tamaños 14.5px, sombras) con sintaxis bracket de Tailwind (`rounded-[18px]`, `text-[14.5px]`).
4. Fuentes Fredoka y Nunito ya cargadas con `next/font/google` en `app/layout.tsx` — no se tocan.
5. Los SVG del mockup se copian **inline** como JSX (sin librería de iconos).
6. Enlaces a rutas inexistentes quedan como `href="#"`.
7. UI copy en español tal cual los mockups ("Volver a Niños", "GESTIÓN", "SALA SOLES", "PADRES VINCULADOS"…).
8. **Código en inglés**: nombres de componentes, tipos, props, variables y constantes en inglés. El español es solo texto visible en pantalla.

## Stack técnico

- Next.js 16.4.2 — App Router, `cacheComponents: true` (todo estático, sin data fetching).
- React 19 + TypeScript. `params` es una `Promise` en los server components (desestructurar con `await`).
- Tailwind CSS v4. Path alias `@/*` → raíz del repo.

## Datos mock

Este spec introduce datos en `lib/children.ts` (nuevo módulo, estilo `lib/posts.ts`):

```ts
type AvatarTone = "blue" | "pink" | "green" | "yellow" | "purple";
type ParentStatus = "active" | "pending";

interface Parent {
  name: string;         // "Lucía Fernández"
  avatarLetter: string; // "L"
  tone: AvatarTone;
  roleLabel: string;    // "Mamá" | "Papá" — solo display
  status: ParentStatus;
}

interface Child {
  id: string;            // slug en inglés: "mateo-fernandez"
  name: string;          // "Mateo Fernández"
  avatarLetter: string;  // "M"
  tone: AvatarTone;
  ageLabel: string;      // "3 años"
  parentsCount: number;  // 0..2 — para el meta de la lista
  allergyTag?: string;   // "MANÍ" | "LACTOSA" — badge de la tarjeta
  needsParentLink?: boolean; // muestra badge "VINCULAR"
  profile: {
    birthDate: string;    // "12 mar 2022"
    room: string;         // "Soles"
    admission: string;    // "feb 2025"
    allergyNote?: string; // banner "Alergias y notas"
    parents: Parent[];
  };
}

export const children: Child[]; // 8 niños, en el orden del mockup
```

- El niño `mateo-fernandez` replica **exactamente** los datos de `perfil-nino.dc.html`.
- Los otros 7 completan el mismo shape con datos coherentes con la lista (edad, padres, tags `LACTOSA` / `VINCULAR` tal como se ven en `ninos.dc.html`).
- Mapa `AVATAR_TONES: Record<AvatarTone, { bg: string; text: string }>` con los 5 pares del mockup: `blue #A9D9E8/#1F7A93`, `pink #F4B8CC/#C44A7A`, `green #B9DEC4/#3E8B62`, `yellow #F4DC8E/#9A7B1E`, `purple #C9B6E8/#7B5FC0`.
- Etiquetas visibles de estado de padre (clave en inglés, label en español): `active → "ACTIVA"` (`#CFEBD8`/`#3E9B6C`), `pending → "PENDIENTE"` (`#F7E7A6`/`#9A7B1E`).

## Tokens nuevos en `app/globals.css`

Agregar al bloque `@theme` existente (los de SPEC-01 se mantienen):

| Token           | Valor     | Uso                                  |
| --------------- | --------- | ------------------------------------ |
| `alert-bg`      | `#FBDAD6` | Fondo del banner de alergias         |
| `alert-icon-bg` | `#F4A8A0` | Caja del ícono del banner            |
| `alert-title`   | `#C5413A` | Título del banner / "Vincular otro…" |
| `alert-text`    | `#B25249` | Cuerpo del banner                    |
| `kid-hover`     | `#F2A78E` | Borde hover de las tarjetas de niño  |
| `line-divider`  | `#E7DAC8` | Línea del separador de sección       |
| `muted-mid`     | `#8A7C6D` | Título "PADRES VINCULADOS"           |

Badges y avatares usan valores bracket directamente (son pares fondo/texto puntuales, no merecen token).

## Archivos

### Modificar

#### `app/_components/sidebar.tsx`

- Agregar prop opcional `activeItem?: "feed" | "kids"` con default `"feed"` (así `app/page.tsx` no cambia).
- Reemplazar la constante `NAV_ITEMS` (que hardcodea `active: true` en Feed) por items con `id` (`"feed" | "kids" | "avisos" | "cuenta"`) y `href`: Feed → `/`, Niños → `/kid`, Avisos y Mi cuenta → `#`.
- El resaltado activo (`bg-coral-soft text-coral-dark font-extrabold`) se calcula con `item.id === activeItem`.
- El logo y el botón "Nueva publicación" siguen en `#`.

#### `app/globals.css`

- Agregar los tokens nuevos de la tabla anterior dentro del `@theme` existente. No tocar el resto.

### Crear

#### `app/_components/kid-card.tsx`

Props: `{ child: Child }`. Link a `/kid/{child.id}`:

- Contenedor: `flex items-center gap-[14px] min-w-0 bg-card border border-line rounded-[18px] p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] transition duration-150 hover:border-kid-hover hover:-translate-y-0.5`.
- Avatar 48px: circle con letra (Fredoka 600, 19px) usando `AVATAR_TONES[child.tone]`.
- Nombre: Fredoka 600, 16px, `text-ink`.
- Meta: `{ageLabel} · ` + `"{parentsCount} padres vinculados"` / `"1 padre vinculado"` / `"sin padres vinculados"` (13px, `text-muted`).
- Trailing: badge `allergyTag` (`rounded-full px-[9px] py-[5px] text-[11px] font-extrabold`, fondo `#FBD8CC` texto `#D9684A`) o badge `needsParentLink` → `"VINCULAR"` (fondo `#F9D2DE`, texto `#C56486`), o si no, chevron SVG 18px `#CBB89F`.

#### `app/_components/allergy-alert.tsx`

Props: `{ note: string }`. Banner:

- `flex gap-[14px] bg-alert-bg rounded-[16px] p-[16px] px-[18px]`.
- Caja ícono 40px `rounded-[11px] bg-alert-icon-bg` con SVG warning (22px, stroke `#fff`) inline.
- Título "Alergias y notas" (`font-extrabold text-[15px] text-alert-title mb-0.5`).
- Cuerpo `{note}` (`text-[14.5px] leading-[1.5] text-alert-text`).

#### `app/_components/linked-parents.tsx`

Props: `{ parents: Parent[] }`. Tarjeta lateral:

- `bg-card border border-line rounded-[16px] p-[16px] px-[18px]`.
- Título "PADRES VINCULADOS" (`text-[12.5px] font-extrabold tracking-[.8px] text-muted-mid mb-[14px]`).
- Filas de padres (`flex items-center gap-3` + `gap-[14px]` entre filas): avatar 40px con `AVATAR_TONES`, nombre (800, 14.5px, ink), meta `{roleLabel} · ` + `"activa"` / `"invitación enviada"` (12.5px, muted), badge estado a la derecha (`text-[10.5px] font-extrabold px-[9px] py-1 rounded-full`, colores por `status`).
- Fila final link `#`: círculo 40px `border-[1.5px] border-dashed border-[#D8CBBA]` con `+` (`text-[#B0A290]`) + "Vincular otro padre" (`font-extrabold text-[14.5px] text-alert-title`).

#### `app/kid/page.tsx` — lista (`/kid`)

Estructura (misma que el resto de la app: `div.flex.min-h-screen.bg-cream` → `<Sidebar activeItem="kids" />` → `main.h-screen.flex-1.min-w-0.overflow-y-auto`):

- Contenedor `max-w-[880px] mx-auto px-10 pt-[34px] pb-20`.
- Header (`flex items-end justify-between gap-4 mb-[22px]`): eyebrow "GESTIÓN" (`text-[12.5px] font-extrabold tracking-[.8px] text-coral-dark mb-1`), `h1` "Niños" (Fredoka 600, 30px) + link "Agregar niño" → `#` (mismo estilo del botón "Nueva publicación" del Sidebar: gradiente `#F4977E→#EE8164`, `rounded-[14px] px-[18px] py-[11px]`, shadow, ícono `+`).
- Buscador (solo visual, **sin estado ni filtrado**): `flex items-center gap-[11px] bg-card border border-line rounded-[14px] px-4 py-3 mb-[22px]` con SVG lupa 18px `#B0A290` + `<input readOnly placeholder="Buscar niño…">` (`flex-1 bg-transparent text-[15px]`, placeholder `#B6A99B`).
- Separador de sección (`flex items-center gap-3 mb-[14px]`): "SALA SOLES" (`text-[12.5px] font-extrabold tracking-[.8px] text-ink`), "8 niños" (`text-[13px] text-muted`), línea `flex-1 h-px bg-line-divider`.
- Grid: `grid grid-cols-2 gap-[14px]` con `.map()` de `children` renderizando `<KidCard />`.

#### `app/kid/[id]/page.tsx` — perfil (`/kid/[id]`)

- `generateStaticParams()` con los 8 `children` (el sitio queda totalmente estático bajo `cacheComponents`).
- `const { id } = await params;` → buscar el niño; si no existe → `notFound()`.
- Sidebar `<Sidebar activeItem="kids" />`; contenedor `max-w-[820px] mx-auto px-10 pt-[34px] pb-20`.
- Link "Volver a Niños" → `/kid` (`flex items-center gap-[1.5px] text-muted-dark font-bold text-[14px] mb-5`, chevron izquierdo 18px).
- Layout `flex gap-[26px] items-start flex-wrap`:
  - **Columna izquierda** (`flex-1 min-w-[300px] flex flex-col gap-[18px]`):
    - Encabezado (`flex items-center gap-[18px]`): avatar 84px (Fredoka 600, 34px, `AVATAR_TONES`), `h1` nombre (Fredoka 600, 28px) + `{ageLabel} · Sala {room}` (15px, `text-muted-dark`), link "Editar" → `#` (`border-[1.5px] border-line bg-card text-[#6E6359] font-bold text-[14px] px-4 py-[9px] rounded-[12px]`).
    - `<AllergyAlert />` solo si `profile.allergyNote` existe.
    - Tarjeta de datos: `bg-card border border-line rounded-[16px] overflow-hidden`; filas `flex justify-between px-[18px] py-[15px] border-b border-line-soft` (última sin borde): label izquierdo 14.5px `text-muted-dark`, valor derecho 800 14.5px ink — "Fecha de nacimiento" / "Sala" / "Ingreso".
  - **Columna derecha** (`w-[300px] flex-none flex flex-col gap-[14px]`):
    - Link "Resumen del día" → `#`: `flex items-center justify-center gap-[9px] w-full p-[13px] rounded-[14px] bg-ink text-white font-extrabold text-[15px]` con SVG sol 18px stroke `#fff`.
    - `<LinkedParents parents={profile.parents} />`.

## Plan de implementación

1. Crear `lib/children.ts` con tipos (`AvatarTone`, `ParentStatus`, `Parent`, `Child`), `AVATAR_TONES`, labels de estado y `children` (8 registros). Verificación: `npx tsc --noEmit` sin errores.
2. Refactorizar `app/_components/sidebar.tsx` con la prop `activeItem` y los hrefs nuevos (`/`, `/kid`). Verificación: `/` se ve idéntico al actual (Feed activo).
3. Agregar los tokens nuevos al `@theme` de `app/globals.css`. Verificación: `npm run dev` carga sin errores.
4. Crear `app/_components/kid-card.tsx`. Verificación: `tsc` limpio.
5. Crear `app/kid/page.tsx` con header, buscador, separador y grid. Verificación: `/kid` renderiza la lista completa con "Niños" activo en el Sidebar; captura Playwright en `.playwright-mcp/` y comparar con `references/screenshots/ninos.png`.
6. Crear `app/_components/allergy-alert.tsx` y `app/_components/linked-parents.tsx`. Verificación: `tsc` limpio.
7. Crear `app/kid/[id]/page.tsx` con `generateStaticParams`, `notFound()` y las dos columnas. Verificación: `/kid/mateo-fernandez` renderiza el perfil; captura Playwright y comparar con `references/pantallas/perfil-nino.dc.html`; `/kid/otro-id` devuelve 404.
8. Verificación final: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Checklist de aceptación

- [x] `/kid` renderiza idéntico a `references/pantallas/ninos.dc.html` (captura Playwright en `.playwright-mcp/` vs `references/screenshots/ninos.png`).
- [ ] `/kid/mateo-fernandez` renderiza idéntico a `references/pantallas/perfil-nino.dc.html` (captura Playwright en `.playwright-mcp/`).
  - **Pendiente — diferencias menores.** Comparación 1:1 de DOM/estilos a 1440×900: 56 elementos en ambos, geometría, tipografías, colores de fondo y espaciados idénticos, salvo 3 detalles que provienen de la propia spec (no del código):
    1. `Volver a Niños`: `gap-[1.5px]` (spec) vs `7px` del mockup.
    2. Letras de los avatares de padres: el mockup usa `#fff` sobre `#C9B6E8` y `#A9C7E8`; la implementación usa `AVATAR_TONES` (`#7B5FC0` / `#1F7A93` sobre `#C9B6E8` / `#A9D9E8`).
    3. `Vincular otro padre`: `#C5413A` (`alert-title`) vs `#C5503A` del mockup.
  - Evidencia: `.playwright-mcp/verify-spec-02-kid-profile.png` vs `.playwright-mcp/verify-spec-02-mockup-profile.png`. Requiere decisión: alinear spec/código al mockup o dar el mockup por desviado.
- [x] Las 8 rutas `/kid/[id]` renderizan con los datos de `lib/children.ts` y pasan `generateStaticParams` (build los pre-renderiza).
- [x] Un `id` inexistente responde 404 (`notFound()`).
- [x] Cada tarjeta de la lista navega a `/kid/{id}`; "Volver a Niños" navega a `/kid`.
- [x] En `/kid` y `/kid/[id]` el item "Niños" del Sidebar está activo (fondo `coral-soft`, texto `coral-dark`, font 800); en `/` sigue activo "Feed".
- [x] El Sidebar con `activeItem` default no rompe `app/page.tsx` (Feed se ve igual que hoy).
- [x] El buscador no filtra (input `readOnly`, sin estado de React).
- [x] Hrefs en `#`: Editar, Agregar niño, Resumen del día, Vincular otro padre, Avisos, Mi cuenta, Nueva publicación, logout, logo.
- [x] Cero estilos inline heredados del mockup: todo vía clases Tailwind; colores nuevos registrados como tokens `@theme`.
- [x] `npm run lint` sin errores.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npm run build` compila.

### Evidencia de la verificación

- **Rutas:** las 8 rutas `/kid/{id}` responden 200 con el `h1` correcto y su tarjeta "PADRES VINCULADOS"; `/kid/otro-id` responde **404**.
- **Navegación:** click en la primera tarjeta → `/kid/mateo-fernandez`; "Volver a Niños" → `/kid`.
- **Sidebar:** en `/kid` y `/kid/[id]` "Niños" tiene `bg #FBE3D8`, `color #D9583C`, `font-weight 800`; en `/` el activo es "Feed". El sidebar de `/` no cambia respecto de `feed.dc.html` (misma geometría y estilos; solo cambia el orden interno de `path`/`circle` del ícono).
- **Lista:** comparación 1:1 de DOM/estilos con `ninos.dc.html` → 72 elementos en ambos, **0 diferencias** (texto, geometría, fuentes, colores, radios, padding, gap).
- **`/kid` capturas:** `.playwright-mcp/verify-spec-02-kid-list.png` vs `.playwright-mcp/verify-spec-02-mockup-list.png`.
- **Buscador:** `<input readOnly>` con `placeholder="Buscar niño…"`; sin `useState` ni `onChange` en `app/`.
- **Estilos:** sin `style={...}` en `app/**/*.tsx`; los 7 tokens nuevos (`alert-bg`, `alert-icon-bg`, `alert-title`, `alert-text`, `kid-hover`, `line-divider`, `muted-mid`) están en el `@theme` de `app/globals.css`.
- **Comandos:** `npm run lint` sin salida de error · `npx tsc --noEmit` exit 0 · `npm run build` OK (14 páginas; `/kid/[id]` pre-renderiza las 8 rutas).

## Decisiones

- **Sí:** una sola spec para lista + perfil. Comparten mock data, layout y el refactor del Sidebar; separarlas duplicaría trabajo.
- **Sí:** rutas `/kid` y `/kid/[id]` (elegidas por el usuario). Sigue la regla de nombres de código en inglés; el mockup usa `ninos`/`perfil-nino` pero eso es copy, no identificador.
- **Sí:** prop `activeItem` en `Sidebar`. Evita duplicar el componente; default `"feed"` para no tocar `app/page.tsx`.
- **No:** duplicar el Sidebar por pantalla. Mantendría dos copias sincronizables.
- **No:** que el buscador filtre. La spec es de interfaz, sin lógica; si se quiere, va en otro spec.
- **No:** hrefs a rutas futuras (`/kid/editar`, `/resumen-dia`…). No existen y SPEC-01 ya estableció el patrón `#`.
- **Sí:** `notFound()` para ids inexistentes. Respuesta estándar de Next.js, sin diseñar pantalla extra.
- **Sí:** datos completos de perfil para los 8 niños (Mateo calca del mockup; los otros 7 con datos plausibles coherentes con la lista).

## Riesgos

| Risco                                      | Mitigación                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| Ruta dinámica bajo `cacheComponents: true` | `generateStaticParams()` con los 8 ids: todo pre-renderizado, sin Suspense ni fetching. |
| `params` como `Promise` en Next 16         | Desestructurar con `await params` en el server component. `tsc` lo detecta si se olvida. |
| Colisión de tokens nuevos con SPEC-01      | Los tokens nuevos tienen nombres propios (`alert-*`, `kid-hover`, `line-divider`, `muted-mid`). |

## Qué **no** está en este spec

- Pantallas: `agregar-nino`, `editar-nino`, `resumen-dia`, `vincular-padre`, `avisos`, `mi-cuenta`, `login`.
- Autenticación y logout real.
- Base de datos / datos reales de niños y padres.
- Filtrado del buscador o cualquier lógica de interacción.
- Responsive (el diseño de referencia es desktop; mobile queda para un spec aparte).
