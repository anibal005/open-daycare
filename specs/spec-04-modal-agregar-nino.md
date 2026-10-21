# SPEC-04 — Modal "Agregar niño" sobre `/kid`

| Campo          | Valor                                                     |
| -------------- | --------------------------------------------------------- |
| **Feature**    | Modal de alta de niño disparado desde `/kid`              |
| **Rama**       | `feat/spec-04-modal-agregar-nino`                         |
| **Estado**     | `Approved`                                                   |
| **Fuente**     | `references/pantallas/agregar-nino.dc.html`               |
| **Referencia** | No hay PNG en `references/screenshots/`; la verificación se hace por captura Playwright contra el mockup HTML. |

## Descripción

Convertir `agregar-nino.dc.html` (hoy una pantalla completa) en un **modal** que se abre sobre `/kid` al presionar el botón "Agregar niño".

El modal replica la tarjeta del mockup (ancho máximo 520px, radio 24px, fondo `#FBF4EC`, borde `#ECE0D0`, sombra `0 20px 50px -24px rgba(63,54,46,.35)`) con sus 5 campos: nombre, fecha de nacimiento, sala, alergias y notas médicas.

**Alcance SOLO visual (más la mecánica del modal):**

- ❌ NO hay base de datos ni persistencia: "Guardar" cierra el modal y no crea nada.
- ❌ NO hay validación de formulario ni mensajes de error.
- ❌ NO se modifica `lib/children.ts` ni la lista de niños.
- ❌ NO se crean rutas nuevas (`/kid/nuevo`, `?nuevo=1`).
- ✅ Sí: abrir/cerrar el modal, con backdrop, Escape, foco y bloqueo de scroll.

## Reglas globales

Mismas que SPEC-01/02/03: Tailwind v4 100%, tokens `--color-*` en el `@theme` de `app/globals.css`, valores arbitrarios con sintaxis bracket, fuentes Fredoka/Nunito ya cargadas con `next/font` (no se tocan), SVG inline como JSX, UI copy en español tal cual el mockup, **código en inglés**, hrefs a rutas inexistentes como `#`.

**Novedad de esta spec:** es el primer componente cliente del proyecto. El directive `"use client"` va **solo** en `app/_components/add-child-modal.tsx`; `app/kid/page.tsx` sigue siendo server component.

## Stack técnico

- Next.js 16.4.2 — App Router, `cacheComponents: true` (todo estático; el modal es cliente pero no hace fetching).
- React 19 + TypeScript.
- Tailwind CSS v4. Path alias `@/*`.

## Tokens

| Token      | Valor     | Uso                             |
| ---------- | --------- | ------------------------------- |
| `modal-bg` | `#FBF4EC` | Fondo de la tarjeta del modal    |

Se reutilizan sin cambiar: `line` (`#ECE0D0`, borde de la tarjeta y divider del header), `input-line` (`#EADFD0`, borde de los inputs — mismo valor del mockup), `ink` (`#3F362E`, título y texto de los campos), `muted-dark` (`#94887B`, "Cancelar" y labels), `coral-dark` (`#D9583C`, "Guardar").

**No** se reutiliza `auth-bg` aunque tenga el mismo valor `#FBF4EC`: ese token pertenece al dominio de auth (SPEC-03); mezclar dominios semánticos en `@theme` complica la lectura.

## Archivos

### Crear

#### `lib/rooms.ts`

```ts
export interface Room {
  id: string;   // "soles"
  name: string; // "Soles"
}

export const ROOMS: Room[]; // Soles, Lunas, Estrellas, Nubes
```

#### `app/_components/add-child-modal.tsx` (`"use client"`)

Export default `AddChildModal`. Contiene **el botón disparador y el modal** (el estado `isOpen` vive acá, así que el trigger tiene que ser parte del mismo árbol cliente).

**Trigger** — reemplaza el `<a href="#">` actual de `app/kid/page.tsx`, mismas clases y mismo ícono `+`:

- `<button type="button">` con `flex items-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.7)]`.
- SVG `+` inline (17px, stroke `#fff`, `strokeWidth 2.4`).

**Overlay** — `fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(63,54,46,.45)] p-6`.

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="add-child-title"`.
- Click en el overlay (no en la tarjeta) → cierra.

**Tarjeta** — `w-full max-w-[520px] rounded-[24px] border border-line bg-modal-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)] overflow-hidden`.

**Header** — `flex items-center justify-between border-b border-line px-[26px] py-[20px]`:

- "Cancelar" → `<button type="button">` `text-[15px] font-bold text-muted-dark` → cierra.
- Título "Agregar niño" → `<span id="add-child-title">` `font-fredoka text-[18px] font-semibold text-ink`.
- "Guardar" → `<button type="submit">` `text-[15px] font-extrabold text-coral-dark` → cierra (sin persistir).

**Body** — `<form>` con `onSubmit` que previene el default y cierra. Contenedor `px-[26px] py-[24px]`.

Campos (label `mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted-dark` con `htmlFor` + `id`):

| Label                  | id                     | Control  | Placeholder                            | Clases del control                                                                 |
| ---------------------- | ---------------------- | -------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| NOMBRE COMPLETO        | `child-name`           | input    | `Ej. Martina López`                   | `mb-[18px] w-full rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none` |
| FECHA DE NACIMIENTO    | `child-birth-date`     | input    | `dd/mm/aaaa`                           | igual, con `min-w-0`                                                                                                                               |
| SALA                   | `child-room`           | select   | — (opciones de `ROOMS`)                | `w-full appearance-none rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[13px] pr-[42px] text-[15px] font-bold text-ink focus:outline-none` |
| ALERGIAS (ETIQUETAS)   | `child-allergies`      | input    | `Ej. Maní, Lactosa`                   | igual al nombre                                                                                                                                    |
| NOTAS MÉDICAS          | `child-medical-notes`  | textarea | `Indicaciones, medicación, contactos…` | `w-full min-h-[90px] resize-y rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[13px] text-[15px] leading-[1.5] text-ink placeholder:text-[#B6A99B] focus:outline-none` |

- La fila "FECHA DE NACIMIENTO" + "SALA" es `flex gap-[14px]` con cada columna `flex-1 min-w-0` (idem al mockup).
- El `<select>` lleva un chevron SVG 16px, stroke `#B0A290`, `pointer-events-none absolute right-4 top-1/2 -translate-y-1/2`, dentro de un wrapper `relative`.
- **Inputs no controlados**: sin `value`, sin `onChange`, sin estado → no hay warning de React 19.

**Comportamiento de accesibilidad** (todo en `useEffect` + listeners):

- Al abrir: `nameInputRef.current?.focus()`.
- Escape → cierra.
- Tab cicla **solo** dentro del modal (7 focusables: Cancelar, Guardar, 4 inputs, select, textarea) → al llegar al último con Tab vuelve al primero y al primero con Shift+Tab va al último.
- Al cerrar: el foco vuelve al botón "Agregar niño".
- Mientras está abierto se agrega la clase `modal-open` a `document.body`; al cerrar (o al desmontar) se quita.

### Modificar

#### `app/globals.css`

- Agregar `--color-modal-bg: #fbf4ec;` al bloque `@theme` (con comentario `/* Add-child modal (SPEC-04) */`).
- Agregar al final la regla de bloqueo de scroll:

```css
/* SPEC-04: lock the page scroll while the add-child modal is open.
   The scroll container is the `main` element, not `body`. */
body.modal-open,
body.modal-open main {
  overflow: hidden;
}
```

#### `app/kid/page.tsx`

- Importar `AddChildModal` de `@/app/_components/add-child-modal`.
- Reemplazar el `<a href="#">Agregar niño</a>` por `<AddChildModal />`. El resto de la página no cambia.

## Plan de implementación

1. Agregar `--color-modal-bg` y la regla `body.modal-open` a `app/globals.css`. Verificación: `npm run dev` carga y `/kid` se ve igual.
2. Crear `lib/rooms.ts` con `Room` + `ROOMS` (4 salas). Verificación: `npx tsc --noEmit` sin errores.
3. Crear `app/_components/add-child-modal.tsx` con trigger + overlay + tarjeta + los 5 campos. Verificación: `npx tsc --noEmit` sin errores.
4. Agregar la accesibilidad: autofocus, Escape, trampa de foco, retorno del foco y bloqueo de scroll. Verificación: `npx tsc --noEmit` sin errores; prueba manual en `/kid`.
5. Cablear `<AddChildModal />` en `app/kid/page.tsx`. Verificación: `/kid` renderiza idéntico salvo que el botón ahora es `<button>`; al clickear se abre el modal.
6. Verificación visual: copia temporal del mockup en `public/_mockups/`, comparación DOM/estilos 1:1 contra el mockup con Playwright (`getBoundingClientRect` + `getComputedStyle`), capturas en `.playwright-mcp/`.
7. Verificación final: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Checklist de aceptación

- [ ] Click en "Agregar niño" en `/kid` abre el modal sobre la página, con overlay `rgba(63,54,46,.45)` y la página `/kid` visible detrás.
- [ ] La tarjeta del modal coincide 1:1 con el mockup: `max-width 520px`, radio 24px, fondo `#FBF4EC`, borde 1px `#ECE0D0`, sombra `0 20px 50px -24px rgba(63,54,46,.35)`.
- [ ] Header con "Cancelar" (bold, `#94887B`, 15px), "Agregar niño" (Fredoka 600, 18px, `#3F362E`) y "Guardar" (extrabold, `#D9583C`, 15px), separados por un divider 1px `#ECE0D0`.
- [ ] Los 5 campos existen con label y placeholder exactos del mockup; el de fecha es input de texto con placeholder `dd/mm/aaaa`; el de notas es `textarea` con `min-height 90px` y `resize: vertical`.
- [ ] El select SALA ofrece Soles, Lunas, Estrellas y Nubes, con "Soles" seleccionado por defecto.
- [ ] "Cancelar" cierra el modal.
- [ ] La tecla Escape cierra el modal.
- [ ] Click en el fondo (fuera de la tarjeta) cierra el modal.
- [ ] "Guardar" cierra el modal y **no** agrega ningún niño a la lista ni persiste nada.
- [ ] Al abrir, el foco queda en el input "Nombre completo"; con Tab el foco no sale de la tarjeta; al cerrar, el foco vuelve al botón "Agregar niño".
- [ ] Con el modal abierto la página de fondo no scrollea; al cerrar conserva la posición de scroll.
- [ ] El diálogo tiene `role="dialog"` y `aria-modal="true"`; cada control tiene su `<label for>`.
- [ ] El select se ve con el chevron del mockup (16px, `#B0A290`) y sin la flecha nativa.
- [ ] Cero estilos inline: todo vía clases Tailwind; el único token nuevo es `--color-modal-bg`.
- [ ] `app/kid/page.tsx` sigue siendo server component (sin `"use client"`); el único archivo cliente es `app/_components/add-child-modal.tsx`.
- [ ] `/kid`, `/kid/[id]`, `/` y `/login` se ven y responden igual que antes del cambio.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Decisiones

- **Sí:** componente cliente aislado (`add-child-modal.tsx`); `app/kid/page.tsx` sigue siendo server component. Es el primer `"use client"` del proyecto y queda contenido en un solo archivo.
- **Sí:** el trigger vive dentro del componente cliente. El estado `isOpen` lo necesita; si el botón quedara en la página, la página entera pasaría a ser cliente.
- **Sí:** `<select>` nativo con `appearance-none` + chevron SVG absoluto. Es un control real (teclado, lectores de pantalla) con la misma pinta que el div del mockup.
- **Sí:** overlay `rgba(63,54,46,.45)` y tarjeta centrada verticalmente. El `align-items:flex-start` + padding 40px del mockup es layout de página, no de modal; la geometría interna de la tarjeta no cambia.
- **Sí:** "Guardar" cierra sin persistir. No hay base de datos en el proyecto (SPEC-01 a SPEC-03 son solo visuales).
- **Sí:** accesibilidad completa (autofocus, Escape, trampa de foco, retorno del foco, bloqueo de scroll).
- **Sí:** bloqueo de scroll vía clase `modal-open` en `body` + regla `body.modal-open main { overflow: hidden }`. El contenedor scrolleable real de `/kid` es `main`, no `body`; bloquear solo `body` no alcanzaba.
- **Sí:** `lib/rooms.ts` nuevo con 4 salas de ejemplo. `lib/children.ts` no se toca: `Child.profile.room` sigue siendo string (SPEC-02) y el select usa `ROOMS`.
- **Sí:** token propio `modal-bg` en vez de reutilizar `auth-bg` (mismo valor, dominio distinto).
- **No:** modal como ruta (`/kid/nuevo`) o query param (`?nuevo=1`). El pedido es un modal, y una ruta rompe el patrón "todo estático" del proyecto.
- **No:** chips/tags para "ALERGIAS (ETIQUETAS)". El mockup usa un input de texto simple.
- **No:** `type="date"` para la fecha. El mockup muestra un input de texto con placeholder `dd/mm/aaaa`; el widget nativo del navegador rompería la fidelidad visual.
- **No:** validación (`required`, mensajes de error, deshabilitar "Guardar").
- **No:** persistencia ni nuevo niño en la lista.
- **No:** modal de "Editar niño" reutilizando este componente. Es una pantalla aparte (`editar-nino.dc.html`) → spec aparte.

## Riesgos

| Riesgo                                                     | Mitigación                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Bloquear solo `body` no frena el scroll de `/kid`          | La regla incluye `body.modal-open main { overflow: hidden }`; el contenedor scrolleable es `main`.                  |
| `appearance-none` en el `<select>` puede dejar el popup nativo raro en Safari | Chevron propio con `pointer-events-none` + `pr-[42px]` para el padding. Se verifica en el screenshot 1:1. |
| La trampa de foco puede dejar el foco en un elemento oculto | El diálogo tiene un set fijo de 7 focusables visibles; la trampa se calcula sobre ese set, no sobre un query abierto. |
| React 19: warning de input controlado sin `onChange`        | Los 5 controles son **no controlados** (sin `value`, sin estado).                                                  |
| Un cliente dentro de un server component rompe el HTML estático | El modal solo se monta cuando `isOpen` es `true`; en el HTML inicial (`isOpen=false`) no hay markup del modal.     |

## Qué **no** está en este spec

- Persistencia de niños, base de datos o API.
- Validación de formulario y mensajes de error.
- Edición de niños (`editar-nino.dc.html`), resumen del día, vincular padre, avisos, mi cuenta.
- Modal de "Editar" reutilizando este componente.
- Responsive: el diseño de referencia es desktop (mobile queda para un spec aparte).
- `screenshots/`: no se agrega PNG de esta pantalla; la referencia es el mockup HTML.
