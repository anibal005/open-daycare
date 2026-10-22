?# SPEC-05 — Modal "Vincular padre" sobre `/kid/[id]`

| Campo          | Valor                                                |
| -------------- | ---------------------------------------------------- |
| **Feature**    | Modal de invitación a un padre, disparado desde el perfil de un niño |
| **Rama**       | `feat/spec-05-modal-vincular-padre`                 |
| **Estado**     | `Implemeted`                                      |
| **Fecha**      | `2026-10-21`                                        |
| **Fuente**     | `references/pantallas/vincular-padre.dc.html`       |
| **Referencia** | No hay PNG en `references/screenshots/`; la verificación se hace por captura Playwright contra el mockup HTML. |

## Descripción

Convertir `vincular-padre.dc.html` (hoy una pantalla completa) en un **modal** que se abre sobre `/kid/[id]` al presionar el botón **"Vincular otro padre"** de la tarjeta "PADRES VINCULADOS".

El modal replica la tarjeta del mockup (ancho máximo 480px, radio 24px, fondo `#FBF4EC`, borde `#ECE0D0`, sombra `0 20px 50px -24px rgba(63,54,46,.35)`) con sus 4 bloques: banner informativo, campos "NOMBRE DEL PADRE/MADRE" + "EMAIL", chips de "PARENTESCO" y bloque de "CÓDIGO DE INVITACIÓN".

**Alcance SOLO visual (más la mecánica del modal y la validación del formulario):**

- ❌ NO hay base de datos ni persistencia: "Enviar invitación" cierra el modal y no crea nada.
- ❌ El padre invitado **no** se agrega a la tarjeta "PADRES VINCULADOS" (la lista sigue viniendo de `lib/children.ts`).
- ❌ NO se envía ningún correo: el código de invitación es un string generado en el cliente.
- ✅ Sí: validación de los campos obligatorios (nombre y email) con mensajes de error en español.
- ✅ Sí: abrir/cerrar el modal, con backdrop, Escape, foco y bloqueo de scroll.
- ✅ El texto del modal es dinámico: usa el nombre del niño de la ruta (el mockup está hardcodeado para Mateo).

## Reglas globales

Mismas que SPEC-01/02/03/04: Tailwind v4 100%, tokens `--color-*` en el `@theme` de `app/globals.css`, valores arbitrarios con sintaxis bracket, fuentes Fredoka/Nunito ya cargadas con `next/font` (no se tocan), SVG inline como JSX, UI copy en español tal cual el mockup, **código en inglés**, hrefs a rutas inexistentes como `#`.

**Patrón heredado de SPEC-04:** el `"use client"` va **solo** en el componente nuevo; `app/_components/linked-parents.tsx` y `app/kid/[id]/page.tsx` siguen siendo server components.

## Stack técnico

- Next.js 16.4.2 — App Router, `cacheComponents: true` (todo estático; el modal es cliente pero no hace fetching).
- React 19 + TypeScript.
- Tailwind CSS v4. Path alias `@/*`.

## Tokens

### Nuevos en `app/globals.css`

Agregar al bloque `@theme` (con el comentario `/* Link-parent modal (SPEC-05) */`):

| Token          | Valor     | Uso                                                  |
| -------------- | --------- | ---------------------------------------------------- |
| `info-bg`      | `#E3ECFB` | Fondo del banner informativo                         |
| `info-icon`    | `#4E72C8` | Trazo del ícono "info" y texto del chip seleccionado |
| `info-text`    | `#3F5694` | Texto del banner informativo                         |
| `invite-bg`    | `#FBF1D6` | Fondo del bloque de código de invitación             |
| `invite-line`  | `#E6D08A` | Borde dashed del bloque de código de invitación      |
| `invite-label` | `#A88526` | "CÓDIGO DE INVITACIÓN" y "Vence en 7 días"           |
| `invite-code`  | `#8A7234` | El código en sí (Fredoka 600, 34px)                  |
| `chip-bg`      | `#CCD8F4` | Fondo del chip de parentesco seleccionado             |
| `chip-line`    | `#9FB8EC` | Borde del chip de parentesco seleccionado              |

### Se reutilizan sin cambiar

| Token         | Valor     | Uso en este modal                                                     |
| ------------- | --------- | --------------------------------------------------------------------- |
| `modal-bg`    | `#FBF4EC` | Fondo de la tarjeta (creado en SPEC-04)                               |
| `line`        | `#ECE0D0` | Borde de la tarjeta, divider del header, borde del chip no seleccionado |
| `line-soft`   | `#F0E6D8` | Fondo del botón de cierre "X"                                         |
| `card`        | `#FFFDF9` | Fondo del chip de parentesco no seleccionado                           |
| `input-line`  | `#EADFD0` | Borde de los inputs                                                   |
| `ink`         | `#3F362E` | Título del modal y color de texto de los inputs                       |
| `muted`       | `#A89A8B` | Subtítulo "a {nombre del niño}"                                       |
| `muted-dark`  | `#94887B` | Labels de los campos y color del botón de cierre "X"                  |
| `alert-title` | `#C5413A` | Texto del disparador "Vincular otro padre"                            |
| `error`       | `#C5413A` | Texto de los mensajes de error (SPEC-04)                              |
| `error-line`  | `#E8B0A6` | Borde del input inválido (SPEC-04)                                    |

Un solo valor queda como bracket: `text-[#6E6359]` (texto del chip no seleccionado), igual que ya hace `app/kid/[id]/page.tsx` con el botón "Editar".

## Datos

No se agregan estructuras nuevas a `lib/children.ts`. El modal solo recibe el **nombre del niño** como prop (`childName`), que viene de `child.name` en `app/kid/[id]/page.tsx`.

### `lib/invite-code.ts` (nuevo)

Generador del código de invitación. Puro, sin React:

```ts
export const INVITE_CODE_LENGTH = 5;
// Sin I, O, 0 ni 1: evita confusiones al leer o dictar el código.
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string;
```

- 32 caracteres de alfabeto y `Uint8Array` de 8 bits → `byte % 32` no introduce sesgo.
- Usa `crypto.getRandomValues` (disponible en navegador y en Node moderno).
- La longitud del código es siempre 5.

## Archivos

### Crear

#### `app/_components/link-parent-modal.tsx` (`"use client"`)

Export default `LinkParentModal`. Contiene **el botón disparador y el modal** (el estado `isOpen` vive acá, así que el trigger tiene que ser parte del mismo árbol cliente).

Props: `{ childName: string }`.

**Estado:**

- `isOpen: boolean` — abre/cierra el modal.
- `inviteCode: string` — código de 5 caracteres; se regenera en cada apertura.
- `kinship: "mother" | "father" | "tutor"` — chip de parentesco seleccionado; default `"mother"` ("Mamá" viene seleccionado, como en el mockup).
- `nameError: string | null`, `emailError: string | null` — mensajes de validación.

**Trigger** — reemplaza el `<a href="#">` actual de `app/_components/linked-parents.tsx`, mismas clases y mismo ícono `+`:

- `<button type="button">` con `flex cursor-pointer items-center gap-3 pt-2`.
- Círculo 40px `flex size-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]` + SVG `+` inline (18px, `stroke="currentColor"`, `strokeWidth 2.2`).
- Texto "Vincular otro padre" `text-[14.5px] font-extrabold text-alert-title`.
- Al hacer click: se genera un `inviteCode` nuevo, se limpian los errores y se abre el modal.

**Overlay** — `fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(63,54,46,.45)] p-6`.

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="link-parent-title"`.
- Click en el overlay (no en la tarjeta) → cierra.

**Tarjeta** — `w-full max-w-[480px] overflow-hidden rounded-[24px] border border-line bg-modal-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]`.

**Header** — `flex items-center justify-between border-b border-line px-[26px] py-[20px]`:

- Bloque izquierdo: título "Vincular padre" (`font-fredoka text-[18px] font-semibold text-ink`, con `id="link-parent-title"`) + subtítulo "a {childName}" (`text-[13px] text-muted`).
- Botón de cierre: `<button type="button">` `flex size-[34px] flex-none items-center justify-center rounded-[10px] bg-line-soft text-muted-dark` con SVG "X" inline (18px, `stroke="currentColor"`, `strokeWidth 2.2`) → cierra.

**Body** — `<form id="link-parent-form" noValidate onSubmit={handleSubmit}>` con `px-[26px] py-[22px]`.

`noValidate` evita los bubbles nativos del navegador: la validación y sus mensajes son propios. El CTA vive dentro del form (a diferencia de SPEC-04, donde el submit estaba en el header), así que es un `<button type="submit">` normal, sin atributo `form`.

**Banner informativo** — `mb-[20px] flex gap-[11px] rounded-[14px] bg-info-bg px-[16px] py-[13px]`:

- Ícono info inline (20px, `stroke="#4E72C8"`, `strokeWidth 2`), `mt-[1px] flex-none`, `aria-hidden="true"`.
- Texto `text-[13.5px] leading-[1.45] text-info-text`: "Le enviaremos un correo con un código para que activate su cuenta. Solo verá el feed de {primer nombre}.".

El texto del banner usa **solo el primer nombre** ("Mateo"), tal como el mockup; el subtítulo del header usa el nombre completo ("Mateo Fernández"). El primer nombre se deriva de `childName` con `childName.split(" ")[0]`.

**Campos** (label `mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted-dark` con `htmlFor` + `id`):

| Label                  | id                  | Control | Placeholder           | Notas                                          |
| ---------------------- | ------------------- | ------- | --------------------- | ---------------------------------------------- |
| NOMBRE DEL PADRE/MADRE | `link-parent-name`  | input   | `Ej. Diego Fernández` | `autoComplete="name"`                          |
| EMAIL                  | `link-parent-email` | input   | `correo@ejemplo.com`  | `type="email"`, `autoComplete="email"`         |
| PARENTESCO             | (radio group)       | radio   | —                     | Label con `mb-[10px]` (el mockup usa 10px, no 8px) |

Control de texto (compartido por nombre y email):

`w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none mb-[18px]`

El borde se **elige**, no se apila: `border-input-line` o `border-error-line` (mismo criterio que SPEC-04: dos utilidades de `border-color` en el mismo elemento resuelven por orden de la hoja de estilos, no por orden del class attribute).

**Chips de parentesco** — fila `mb-[20px] flex gap-[9px]`, 3 chips iguales (`flex-1`):

- Cada chip es un `<label className="relative flex-1">` que envuelve:
  - `<input type="radio" name="link-parent-kinship">` con `peer absolute size-0 opacity-0` — fuera del flujo, para no sumar un nodo al layout (SPEC-03 tuvo que evitar `sr-only` por 4px de desplazamiento).
  - `<span>` con el texto: `block rounded-full border-[1.5px] border-line bg-card px-[11px] py-[11px] text-center text-[14px] font-extrabold text-[#6E6359]`.
- Estado seleccionado (chip "Mamá" por defecto) vía variantes `peer-checked:`: `peer-checked:border-chip-line peer-checked:bg-chip-bg peer-checked:text-info-icon`.
- Foco visible en el chip: `peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#4E72C8]`.

Son **radios nativos**: el grupo expone un solo tab stop (el radio marcado) y se recorre con las flechas del teclado.

**Bloque de código** — `mb-[20px] rounded-[16px] border-[1.5px] border-dashed border-invite-line bg-invite-bg p-[18px] text-center`:

- "CÓDIGO DE INVITACIÓN" — `mb-2 text-[12px] font-extrabold tracking-[.7px] text-invite-label`.
- El código — `font-fredoka text-[34px] font-semibold tracking-[7px] text-invite-code`.
- "Vence en 7 días" — `mt-[6px] text-[13px] text-invite-label`.

El `tracking-[7px]` agrega un espacio después del último carácter, así que el código queda ~3.5px a la izquierda del centro. **Es el comportamiento exacto del mockup**: no compensar.

**CTA** — `<button type="submit">`:

`flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]`

Ícono de envío inline (19px, `stroke="#fff"`, `strokeWidth 2`) + texto "Enviar invitación".

**Validación** (estado `nameError` / `emailError`):

- "NOMBRE DEL PADRE/MADRE" y "EMAIL" son **obligatorios** (`required` + `noValidate` en el `<form>`).
- Nombre: `trim()` no vacío → "Ingresá el nombre del padre/madre".
- Email: no vacío → "Ingresá el correo del padre/madre"; formato inválido (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) → "Ingresá un correo válido".
- "Enviar invitación" **no** se deshabilita: al enviar con errores, el modal **permanece abierto**, se marca el primer campo inválido con `aria-invalid` + `aria-describedby`, se muestra el mensaje bajo el campo (`<p role="alert">`) y se mueve el foco al campo con error.
- El error de un campo se recalcula en cada `onChange` de ese campo (solo si ya había fallado), así desaparece solo al corregirlo.
- Al reabrir el modal, los errores se limpian y los campos vuelven a estar vacíos (el modal se desmonta al cerrarse).
- Los inputs son **no controlados** (sin `value`, sin estado) → sin warning de React 19. Los valores se leen del DOM (`ref.current.value`) al validar.

**Comportamiento de accesibilidad** (mismo esqueleto que SPEC-04, todo en `useEffect` + listeners):

- Al abrir: `nameInputRef.current?.focus({ preventScroll: true })`.
- Escape → cierra.
- Tab cicla **solo** dentro del modal. Set de focusables: botón de cierre, input de nombre, input de email, los 3 radios y el botón de submit (7 elementos, de los cuales solo 5 son tab stops porque el grupo de radios expone solo el marcado). La trampa se calcula sobre un array explícito de refs, no sobre un query abierto.
- Al cerrar: el foco vuelve al botón "Vincular otro padre".
- Mientras está abierto se agrega la clase `modal-open` a `document.body`; al cerrar (o al desmontar) se quita. La regla CSS `body.modal-open, body.modal-open main { overflow: hidden }` **ya existe** (SPEC-04): no se duplica ni se modifica.

### Modificar

#### `app/_components/linked-parents.tsx`

- Importar `LinkParentModal` de `@/app/_components/link-parent-modal`.
- Props: `{ parents: Parent[]; childName: string }`.
- Reemplazar el `<a href="#">Vincular otro padre</a>` por `<LinkParentModal childName={childName} />`. El resto de la tarjeta no cambia.

#### `app/kid/[id]/page.tsx`

- `<LinkedParents parents={profile.parents} childName={child.name} />`.
- El resto de la página no cambia.

#### `app/globals.css`

- Agregar los tokens nuevos de la tabla al bloque `@theme` (sección `/* Link-parent modal (SPEC-05) */`).
- No agregar reglas CSS nuevas: el bloqueo de scroll de SPEC-04 se reutiliza.

## Plan de implementación

1. Agregar los tokens nuevos a `app/globals.css`. Verificación: `npm run dev` carga y `/kid/[id]` se ve igual.
2. Crear `lib/invite-code.ts` con el alfabeto, la longitud y `generateInviteCode()`. Verificación: `npx tsc --noEmit` sin errores.
3. Crear `app/_components/link-parent-modal.tsx` con trigger + overlay + tarjeta + banner + campos + chips + bloque de código + CTA. Verificación: `npx tsc --noEmit` sin errores.
4. Agregar la accesibilidad: autofocus, Escape, trampa de foco, retorno del foco y bloqueo de scroll. Verificación: `npx tsc --noEmit` sin errores; prueba manual en `/kid/mateo-fernandez`.
5. Agregar la validación de nombre y email. Verificación: `npx tsc --noEmit` sin errores; prueba manual (submit vacío, email sin `@`, email sin dominio, email válido).
6. Cablear el componente: `linked-parents.tsx` (nueva prop `childName`) y `app/kid/[id]/page.tsx`. Verificación: `/kid/mateo-fernandez` renderiza idéntico salvo que "Vincular otro padre" ahora es `<button>`; al clickear se abre el modal.
7. Verificación visual: copia temporal del mockup en `public/_mockups/`, comparación DOM/estilos 1:1 contra el mockup con Playwright (`getBoundingClientRect` + `getComputedStyle`), capturas en `.playwright-mcp/`.
8. Verificación final: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Checklist de aceptación (Acceptance criteria)

Modal y disparador:

- [x] En `/kid/mateo-fernandez`, el botón "Vincular otro padre" abre el modal sobre la página, con overlay `rgba(63,54,46,.45)` y el perfil visible detrás.
- [x] El disparador conserva el aspecto actual: círculo 40px con borde dashed `#D8CBBA` y `+` en `#B0A290`, texto 14.5px extrabold `#C5413A`.
- [x] El disparador es un `<button type="button">` (ya no un `<a href="#">`) y no navega a ninguna ruta.
- [x] La tarjeta coincide 1:1 con el mockup: `max-width 480px`, radio 24px, fondo `#FBF4EC`, borde 1px `#ECE0D0`, sombra `0 20px 50px -24px rgba(63,54,46,.35)`.
- [x] Header con "Vincular padre" (Fredoka 600, 18px, `#3F362E`), subtítulo "a {nombre del niño}" (13px, `#A89A8B`) y botón de cierre 34px (fondo `#F0E6D8`, X `#94887B`), separados por un divider 1px `#ECE0D0`.
- [x] El texto del modal es dinámico: en `/kid/sofia-mendez` el subtítulo dice "a Sofía Méndez" y el banner "Solo verá el feed de Sofía." (no hay "Mateo" hardcodeado).
- [x] Banner informativo con fondo `#E3ECFB`, radio 14px, ícono info 20px `#4E72C8` y texto 13.5px `#3F5694` con el texto exacto del mockup.
- [x] Campo "NOMBRE DEL PADRE/MADRE" con placeholder `Ej. Diego Fernández` y campo "EMAIL" (`type="email"`) con placeholder `correo@ejemplo.com`.
- [x] Campo "PARENTESCO" con 3 chips "Mamá", "Papá" y "Tutor/a"; "Mamá" viene seleccionado por defecto con fondo `#CCD8F4`, borde `#9FB8EC` y texto `#4E72C8`; los otros dos con fondo `#FFFDF9`, borde `#ECE0D0` y texto `#6E6359`.
- [x] Solo un chip puede estar seleccionado a la vez; al elegir otro, el anterior se deselecciona.
- [x] Los chips son un radio group real: se alcanza con Tab y se cambia de chip con las flechas del teclado.
- [x] Bloque de código con fondo `#FBF1D6`, borde 1.5px dashed `#E6D08A`, radio 16px; "CÓDIGO DE INVITACIÓN" 12px/800/`#A88526`; el código en Fredoka 600 34px con `letter-spacing 7px` en `#8A7234`; "Vence en 7 días" 13px `#A88526`.
- [x] El código tiene 5 caracteres alfanuméricos (sin `I`, `O`, `0` ni `1`) y es distinto en cada apertura del modal.
- [x] CTA "Enviar invitación" con gradiente `#F4977E`→`#EE8164`, padding 14px, radio 14px, texto 15.5px extrabold blanco, ícono de envío 19px y sombra `0 10px 22px -8px rgba(238,129,100,.7)`.

Comportamiento:

- [x] La tecla Escape cierra el modal.
- [x] Click en el fondo (fuera de la tarjeta) cierra el modal.
- [x] El botón "X" del header cierra el modal.
- [x] Al abrir, el foco queda en el input "Nombre del padre/madre".
- [x] Con el modal abierto el foco no sale de la tarjeta con Tab ni con Shift+Tab.
- [x] Al cerrar, el foco vuelve al botón "Vincular otro padre".
- [x] Con el modal abierto la página de fondo no scrollea; al cerrar conserva la posición de scroll.
- [x] El diálogo tiene `role="dialog"` y `aria-modal="true"`; cada control tiene `<label for>` o está envuelto por su `<label>`.

Validación:

- [x] "Enviar invitación" con el nombre vacío (o solo con espacios) deja el modal abierto y muestra "Ingresá el nombre del padre/madre" bajo el campo.
- [x] "Enviar invitación" con el email vacío deja el modal abierto y muestra "Ingresá el correo del padre/madre".
- [x] "Enviar invitación" con un email mal formado (sin `@` o sin dominio) deja el modal abierto y muestra "Ingresá un correo válido".
- [x] El error de un campo desaparece solo al corregir el valor; el modal no muestra bubbles nativos del navegador.
- [x] "Enviar invitación" con datos válidos cierra el modal y **no** agrega ningún padre a "PADRES VINCULADOS" ni persiste nada.
- [x] Al reabrir el modal después de un envío fallido, los campos están vacíos, no hay mensajes de error y el código es nuevo.

Arquitectura y convenciones:

- [x] `app/_components/link-parent-modal.tsx` es el único archivo nuevo con `"use client"`; `linked-parents.tsx` y `app/kid/[id]/page.tsx` siguen siendo server components.
- [x] `lib/invite-code.ts` exporta `generateInviteCode()` y el código se genera en el handler del click, nunca durante el render (no hay mismatch de hidratación ni código en el HTML estático).
- [x] Cero estilos inline: todo vía clases Tailwind; los tokens nuevos están en el `@theme` de `app/globals.css`.
- [x] `app/kid/[id]/page.tsx` le pasa `childName` a `LinkedParents`, y `LinkedParents` a `LinkParentModal`.
- [x] `/kid`, `/`, `/login` y `/activate-account` se ven y responden igual que antes del cambio.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Decisiones

- **Sí:** componente cliente aislado (`link-parent-modal.tsx`); `linked-parents.tsx` y `app/kid/[id]/page.tsx` siguen siendo server components. Es el mismo criterio que SPEC-04: el estado del modal obliga a que el trigger viva en el mismo árbol cliente.
- **Sí:** el trigger **reemplaza** al `<a href="#">` actual, en vez de agregarse un botón nuevo al lado. La fila final de "PADRES VINCULADOS" sigue siendo la última.
- **Sí:** solo visual + validación de nombre y email. "Enviar invitación" valida y cierra, sin persistir: no hay base de datos en el proyecto (SPEC-01 a SPEC-04 son visuales).
- **Sí:** el código de invitación se genera en el cliente al abrir el modal (5 caracteres, alfabeto sin caracteres ambiguos). Da la sensación de un código real sin inventar un backend.
- **Sí:** "Vence en 7 días" es texto fijo. El código se genera en el momento de abrir el modal, así que el vencimiento siempre es a 7 días; no hace falta calcular una fecha.
- **Sí:** los chips de parentesco son radios nativos ocultos (`peer absolute size-0 opacity-0` + `peer-checked:`). Aportan semántica y teclado correctos sin romper la maqueta; la apariencia la dan las variantes `peer-checked:`.
- **Sí:** "Mamá" viene seleccionado por defecto, como en el mockup. El parentesco nunca bloquea el envío.
- **Sí:** validación de email con regex simple (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). No hace falta un validador de dominio.
- **Sí:** se reutiliza la clase `modal-open` y la regla `body.modal-open, body.modal-open main { overflow: hidden }` de SPEC-04. No se duplica CSS de scroll lock.
- **Sí:** el banner usa el primer nombre y el subtítulo el nombre completo, reproduciendo el mockup. El primer nombre se deriva con `childName.split(" ")[0]`.
- **Sí:** se mantiene `text-alert-title` (`#C5413A`) en el disparador, aunque el mockup use `#C5503A`. Es la desviación que SPEC-02 ya dejó anotada; unificarlo acá tocaría una pantalla ya verificada.
- **No:** ruta `/vincular-padre` o query param (`?vincular=1`). El pedido es un modal, y una ruta rompe el patrón "todo estático" del proyecto.
- **No:** agregar el padre invitado a "PADRES VINCULADOS" con estado PENDIENTE. Exigiría volver client-side la lista de padres (que hoy es un server component con mock data) y un estado optimista sin persistencia.
- **No:** envío real de correo, bandeja de invitaciones, ni pantalla de activación propia (ya existe `/activate-account`, SPEC-03).
- **No:** botón de "copiar código" al portapapeles. No está en el mockup.
- **No:** extraer un hook compartido de modal (autofocus, Escape, trampa de foco) reutilizable por SPEC-04 y SPEC-05. SPEC-04 está implementada y verificada; refactorizarla es otra spec.
- **No:** abrir el modal desde el badge "VINCULAR" de la lista de niños (`/kid`). Es otra pantalla y otra spec.

## Riesgos

| Riesgo                                                          | Mitigación                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `crypto.getRandomValues` no existe en el servidor              | El código se genera en el handler del click (siempre en el cliente). El HTML estático nunca incluye un código → sin mismatch de hidratación. |
| El grupo de radios expone un solo tab stop                      | La trampa de foco usa un array explícito de refs (7 elementos) en lugar de asumir un tab stop por control; el grupo se recorre con las flechas. |
| `peer-checked:` contra `border-line`                            | Las utilidades con variante se emiten después de las base en la hoja de estilos → gana `peer-checked:border-chip-line`. Se verifica en el screenshot 1:1. |
| El input radio oculto genera un nodo en el layout               | `absolute size-0 opacity-0` (fuera del flujo) en lugar de `sr-only`, que en SPEC-03 desplazó 4px el bloque siguiente.    |
| `tracking-[7px]` descentra el código                            | Es el comportamiento exacto del mockup (el `letter-spacing` suma un espacio al final). No compensar.                   |
| La tarjeta vive dentro de `main`, que es el contenedor scrolleable | El overlay es `fixed` y `main` no tiene `transform`, así que se posiciona contra el viewport. Mismo patrón que SPEC-04. |
| El disparador deja de ser un enlace                             | SPEC-02 exige "Hrefs en `#`: … Vincular otro padre …". Ese criterio queda superado por esta spec: pasa a ser `<button type="button">` sin navegación. |

## Qué **no** está en este spec

- Persistencia de padres, base de datos o API.
- Envío real de correo o bandeja de invitaciones.
- Mostrar el padre invitado en "PADRES VINCULADOS".
- Copiar el código al portapapeles.
- Ruta `/vincular-padre` (sigue siendo un modal sobre `/kid/[id]`).
- Modal de vinculación desde la lista `/kid` (badge "VINCULAR").
- Feed de familia para el padre invitado (ruta inexistente).
- Refactor de SPEC-04 para compartir el hook de modal.
- Responsive: el diseño de referencia es desktop (mobile queda para un spec aparte).
- `screenshots/`: no se agrega PNG de esta pantalla; la referencia es el mockup HTML.
