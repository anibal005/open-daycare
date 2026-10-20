# SPEC-03 — Pantallas de acceso: `/login` y `/activate-account`

| Campo          | Valor                                              |
| -------------- | -------------------------------------------------- |
| **Feature**    | Pantallas de acceso: Login y Activar cuenta        |
| **Rama**       | `feat/spec-03-login-activar-cuenta`                |
| **Estado**     | `Implemented`                                      |
| **Fuente**     | `references/pantallas/login.dc.html`               |
|                | `references/pantallas/activar-cuenta.dc.html`      |
| **Referencia** | No hay PNG en `references/screenshots/`; la verificación se hace por captura Playwright contra el mockup HTML. |

## Descripción

Implementar `login.dc.html` como `/login` (`app/(auth)/login/page.tsx`) y `activar-cuenta.dc.html` como `/activate-account` (`app/(auth)/activate-account/page.tsx`).

Ambas pantallas viven bajo el route group `app/(auth)/`: agrupa las rutas de acceso y deja lugar para un `layout.tsx` compartido si en el futuro se necesita. El route group no aparece en la URL.

**Alcance SOLO visual:**

- ❌ NO hay autenticación real ni validación de credenciales.
- ❌ NO se muestra la sección "INGRESO COMO" (Personal / Familia) en el login — decisión del usuario.
- ❌ NO existe pantalla de recuperación de contraseña.
- ❌ NO hay base de datos ni fetching.
- ✅ Navegación real entre ambas pantallas y hacia `/` (feed de SPEC-01).
- ✅ El resultado debe lucir **idéntico** a los mockups (menos la sección de rol eliminada).

## Reglas globales

Mismas que SPEC-01/SPEC-02: Tailwind v4 100%, tokens `--color-*` en el `@theme` de `app/globals.css`, valores arbitrarios con sintaxis bracket, fuentes Fredoka/Nunito ya cargadas con `next/font` (no se tocan), SVG inline como JSX, UI copy en español tal cual el mockup, **código en inglés** (componentes, tipos, props), enlaces a rutas inexistentes como `#`.

## Stack técnico

- Next.js 16.4.2 — App Router, `cacheComponents: true` (todo estático, sin data fetching).
- React 19 + TypeScript. **Server components**: sin `useState`, sin `"use client"`. Los inputs usan `defaultValue` (no `value`) para evitar el warning de React de input controlado sin `onChange`.
- Tailwind CSS v4. Path alias `@/*`.

## Tokens nuevos en `app/globals.css`

Agregar al bloque `@theme` existente (SPEC-01 y SPEC-02 se mantienen):

| Token        | Valor     | Uso                                                                |
| ------------ | --------- | ------------------------------------------------------------------ |
| `auth-bg`    | `#FBF4EC` | Fondo de ambas pantallas. **Distinto** de `cream` (#F6ECDF) del feed. |
| `input-line` | `#EADFD0` | Borde de los inputs y de la tarjeta de invitación.                  |
| `auth-link`  | `#C5503A` | "¿Olvidaste tu contraseña?", "Activá tu cuenta", "Iniciar sesión".  |

Se reutilizan sin cambiar: `ink` (#3F362E), `muted-dark` (#94887B), `kid-hover` (#F2A78E, borde del input "Crear contraseña").

## Archivos

### Modificar

#### `app/globals.css`

- Agregar los 3 tokens de la tabla al `@theme`. No tocar nada más.

### Crear

#### `app/_components/auth-field.tsx`

Componente compartido (label + input). Props: `{ id: string; label: string; type?: string; defaultValue?: string; placeholder?: string; inputClassName?: string }`.

- Label: `htmlFor={id}` + `block text-[12px] font-bold tracking-[.7px] text-muted-dark mb-2` (texto en español: "EMAIL", "CONTRASEÑA"…).
- Input: `id={id}` + `w-full rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none mb-[18px]`.
- `inputClassName` permite sobreescribir (usado por el campo código).

#### `app/(auth)/login/page.tsx` — `/login`

Server component. Estructura: `<div className="min-h-screen grid grid-cols-[1.05fr_1fr] bg-auth-bg">` con dos paneles (sin Sidebar):

- **Panel izquierdo**: `relative overflow-hidden flex flex-col justify-between p-[56px_60px] text-white bg-[linear-gradient(155deg,#F6A98E_0%,#F2937A_45%,#EC7E62_100%)]`.
  - Dos círculos decorativos `absolute rounded-full`: 420px `bg-white/[.12]` arriba-derecha, 300px `bg-white/[.10]` abajo-izquierda.
  - Logo: tile 46px `rounded-[14px] bg-white/[.22]` + SVG sol 26px inline + "OpenDayCare" (Fredoka 600, 21px, tracking-[.5px]).
  - `h1` "El día de cada niño,\<br\>compartido con su familia." (Fredoka 600, 42px, leading-[1.12]) + párrafo (17px, max-w-[430px], `text-white/90`).
  - Footer: "🌿 Guardería Sala Soles" (14px, `text-white/90`).
- **Panel derecho**: `flex items-center justify-center p-10`, contenido `w-full max-w-[392px]`:
  - `h2` "Iniciar sesión" (Fredoka 600, 30px) + "Ingresá para ver el día de hoy." (`text-muted-dark`, 15px).
  - ~~INGRESO COMO~~ — **sección eliminada**: no hay label ni botones Personal/Familia.
  - `<AuthField label="EMAIL" type="email" defaultValue="caro@opendaycare.com" />`.
  - `<AuthField label="CONTRASEÑA" type="password" placeholder="••••••••" />`.
  - "¿Olvidaste tu contraseña?" → `href="#"` (`text-auth-link font-bold text-[13.5px]`, alineado a la derecha).
  - Botón `Link` a `/`: `block w-full rounded-[15px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] py-[15px] text-center text-white font-extrabold text-[16px] shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]`.
  - Footer: "¿Te invitó la guardería? " + `Link` a `/activate-account` "Activá tu cuenta" (`text-auth-link font-extrabold`).

#### `app/(auth)/activate-account/page.tsx` — `/activate-account`

Server component. Estructura: `flex min-h-screen items-center justify-center bg-auth-bg p-10`, contenido `w-full max-w-[440px]` (sin Sidebar):

- Logo: tile 58px `rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)]` + shadow + SVG sol 30px.
- `h1` "Bienvenida a OpenDayCare" (Fredoka 600, 32px) + párrafo "Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar la cuenta." (`text-muted-dark`, 15.5px).
- Tarjeta de invitación: `flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-input-line bg-white p-4` — avatar 44px circle `bg-[#A9D9E8] text-[#1F7A93]` (Fredoka 600, 19px) "M" + "Te invitaron a seguir a" (13px, muted) / "Mateo · Sala Soles" (Fredoka 600, 17px).
- `<AuthField label="CÓDIGO DE INVITACIÓN" defaultValue="7K4P9" inputClassName="font-fredoka text-[18px] font-bold tracking-[3px]" />`.
- `<AuthField label="EMAIL" type="email" defaultValue="lucia.fernandez@gmail.com" />`.
- `<AuthField label="CREAR CONTRASEÑA" type="password" defaultValue="contraseña" inputClassName="border-kid-hover" />`.
- Checkbox **estático marcado**: `<label>` con `bg-[#FBF1D6] rounded-[14px] p-4 flex gap-3` — `<input type="checkbox" defaultChecked className="sr-only" />` + span visual 24px `rounded-[8px] bg-[#5FB97E]` con SVG palomita 15px blanca + texto "Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app." (14px, `text-[#8A7234]`, leading-[1.45]).
- Botón `Link` a `/` "Activar mi cuenta" (mismo estilo que el de login).
- Footer: "¿Ya tenés cuenta? " + `Link` a `/login` (`text-auth-link font-extrabold`).

## Plan de implementación

1. Agregar los 3 tokens al `@theme` de `app/globals.css`. Verificación: `npm run dev` carga y `/` no cambió.
2. Crear `app/_components/auth-field.tsx`. Verificación: `npx tsc --noEmit` sin errores.
3. Crear `app/(auth)/login/page.tsx`. Verificación: `/login` renderiza sin la sección "INGRESO COMO"; captura Playwright en `.playwright-mcp/` y comparar con `references/pantallas/login.dc.html`.
4. Crear `app/(auth)/activate-account/page.tsx`. Verificación: `/activate-account` renderiza; captura Playwright y comparar con el mockup.
5. Verificar navegación: "Activá tu cuenta" → `/activate-account`, "Iniciar sesión" (footer) → `/login`, ambos botones principales → `/`, "¿Olvidaste tu contraseña?" → `#`.
6. Verificación final: `npm run lint`, `npx tsc --noEmit`, `npm run build` sin errores.

## Checklist de aceptación

- [x] `/login` renderiza idéntico a `references/pantallas/login.dc.html` **sin** la sección "INGRESO COMO" (captura Playwright en `.playwright-mcp/`).
- [x] `/activate-account` renderiza idéntico a `references/pantallas/activar-cuenta.dc.html` (captura Playwright).
- [x] No existe ningún botón ni label "Personal" / "Familia" en `/login`.
- [x] Email prellenado `caro@opendaycare.com` en login; código `7K4P9`, email `lucia.fernandez@gmail.com` y contraseña prellenados en activar-cuenta.
- [x] El checkbox de autorización de fotos aparece siempre marcado.
- [x] "Iniciar sesión" (login) y "Activar mi cuenta" navegan a `/`.
- [x] "Activá tu cuenta" navega a `/activate-account`; "Iniciar sesión" del footer de activar navega a `/login`.
- [x] "¿Olvidaste tu contraseña?" tiene `href="#"`.
- [x] Ni `/login` ni `/activate-account` muestran el Sidebar.
- [x] Cero `style={...}` inline y cero `useState` / `"use client"` en los archivos nuevos.
- [x] Los 3 tokens nuevos están en el `@theme` de `app/globals.css`.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

### Evidencia de la verificación

- **Método:** comparación DOM/estilos 1:1 a 1440×900 contra los mockups servidos por el dev server (copia temporal de `references/pantallas/*.dc.html` en `public/_mockups/`, borrada al terminar). El modelo no puede leer imágenes, así que la comparación fue por `getBoundingClientRect` + `getComputedStyle` en lugar de a ojo.
- **`/login`:** geometría, tipografías, tamaños y colores idénticos a los del mockup entre el bloque `Iniciar sesión` y el link "Activá tu cuenta". El bloque central queda 43px más arriba que en el mockup **por diseño**: sin la sección "INGRESO COMO" el contenido es más corto y el `items-center` lo re-centra. Los únicos nodos que sobran en el mockup son los 14 del selector de rol.
- **`/activate-account`:** 28 elementos en la implementación vs 29 en el mockup; los 28 coinciden en texto, geometría, fuentes, colores, radios, paddings y gaps. El único extra de la implementación es el `<input type="checkbox">` oculto (`hidden`), sin efecto en el layout.
- **Tokens:** `--color-auth-bg = #fbf4ec`, `--color-auth-link = #c5503a`, `--color-input-line = #eadfd0`; los links resuelven `rgb(197,80,58)` y el fondo raíz `rgb(251,244,236)`.
- **Navegación (clicks reales):** `Activá tu cuenta` → `/activate-account`; `Iniciar sesión` del footer → `/login`; botón `Iniciar sesión` → `/`; botón `Activar mi cuenta` → `/`; "¿Olvidaste tu contraseña?" → `href="#"`.
- **Sin sección de rol:** `innerText` de `/login` no contiene "INGRESO COMO", "Personal" ni "Familia"; no hay `<aside>`.
- **Checkbox:** 1 checkbox en `/activate-account`, `checked=true`.
- **Capturas:** `.playwright-mcp/verify-spec-03-login-impl.png`, `verify-spec-03-login-mock.png`, `verify-spec-03-activate-impl.png`, `verify-spec-03-activate-mock.png`.
- **Comandos:** `npx tsc --noEmit` exit 0 · `npm run lint` sin salida de error · `npm run build` OK (16 páginas; `/login` y `/activate-account` prerenderizadas).
- **Route group:** tras mover las páginas a `app/(auth)/`, `/login`, `/activate-account`, `/` y `/kid` siguen respondiendo 200; el build reporta las mismas rutas. Los errores de `tsc` en `.next/types/validator.ts` eran tipos generados con las rutas viejas: se resolvieron borrando `.next` (requiere parar el dev server, que bloquea la carpeta).

### Notas de implementación

- `bg-white/[.12]` y `text-white/90` se escribieron como valores bracket (`bg-[rgba(255,255,255,.12)]`, `text-[rgba(255,255,255,.92)]`) para que la comparación de colores coincida exactamente con el mockup.
- El checkbox usa `className="hidden"` en lugar de `sr-only`: `sr-only` deja un nodo 1×1 en el flujo y desplazaba 4px el bloque siguiente.
- `AuthField` recibe `id` y enlaza `htmlFor`/`id` (el mockup no tiene `id`s, pero el label suelto sin asociar era un problema de accesibilidad). El `<label>` del checkbox envuelve al input, así que no necesita `htmlFor`.
- El botón principal quedó con `p-[15px]` (no `py-[15px]`) para calcar el `padding:15px` del `<a>` del mockup.
- Los `<a>` del mockup ("¿Olvidaste tu contraseña?" y "Iniciar sesión") se renderizan como `<a>`/`<Link>`; el botón principal del mockup es un `<a>` y en la implementación es un `<Link>` con el mismo estilo.

## Decisiones

- **Sí:** rutas `/login` y `/activate-account` (elegidas por el usuario). Regla de código en inglés, como `/kid` en SPEC-02.
- **Sí:** ambas páginas bajo el route group `app/(auth)/`. Agrupa las rutas de acceso, no cambia la URL y deja espacio para un `layout.tsx` compartido futuro. El import de `AuthField` usa el alias absoluto `@/app/_components/auth-field`, así que el movimiento no rompió nada.
- **Sí:** eliminar la sección "INGRESO COMO" completa (decisión del usuario: no usamos el selector Personal/Familia).
- **Sí:** mantener el email prellenado `caro@opendaycare.com` (el mockup nunca muestra inputs vacíos).
- **Sí:** botón principal de ambas pantallas → `/` (decisión del usuario; no existe feed de familia).
- **Sí:** solo visual, server components; `defaultValue` en inputs en lugar de `value` (evita el warning de React de input controlado sin `onChange`).
- **Sí:** checkbox con `defaultChecked` + `sr-only` sobre el span visual: estático pero semánticamente un input real.
- **Sí:** componente compartido `AuthField` — el patrón label+input se repite 5 veces entre ambas pantallas.
- **Sí:** token propio `auth-bg #FBF4EC`, separado de `cream #F6ECDF` — los mockups de auth usan un fondo distinto al feed.
- **No:** módulo en `lib/` para la invitación. Es un único registro estático; va inline en la página.
- **No:** importar `AVATAR_TONES` de `lib/children.ts` para el avatar "M" — es un color one-off del card de invitación; bracket directo.
- **No:** pantalla de recuperación de contraseña — no existe; el link queda en `#` (patrón de specs previas).

## Riesgos

| Risco                                                     | Mitigación                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Confundir los dos cremas (#F6ECDF del feed vs #FBF4EC de auth) | Token `auth-bg` con nombre explícito; documentado en la tabla de tokens.      |
| Warning de React por inputs con `value` sin `onChange`    | Especificar `defaultValue` en todos los inputs.                                    |
| Gradiente 155° no expresable con `bg-gradient-to-*`       | Clase bracket completa: `bg-[linear-gradient(155deg,#F6A98E_0%,...)]`.             |

## Qué **no** está en este spec

- Autenticación, validación de credenciales o registro de personal.
- Recuperación de contraseña.
- Feed de familia (`familia-feed`) — ruta inexistente; los botones apuntan a `/`.
- Cambiar el Sidebar del feed para apuntar el logout a `/login`.
- Responsive (el diseño de referencia es desktop; mobile queda para un spec aparte).
