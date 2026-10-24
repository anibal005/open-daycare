# SPEC-09 — Autenticación real con email y contraseña + protección de rutas

> **Estado:** Approved  
> **Depende de:** SPEC-03  
> **Fecha:** 2026-10-23  
> **Objetivo:** Implementar autenticación real con email y contraseña mediante Supabase Auth y proteger las rutas de la app usando el proxy/middleware existente, redirigiendo según el estado de sesión.

## Alcance

**Dentro:**
- Login real con `supabase.auth.signInWithPassword` en `/login` (solo email + contraseña).
- Protección de rutas en el `proxy`/`updateSession`: solo `(auth)` (`/login`, `/activate-account`) son públicas; el resto requiere sesión.
- Redirecciones: si no hay sesión y se intenta acceder a ruta protegida → `/login`. Si hay sesión y se intenta acceder a `/login` o `/activate-account` → `/`.
- Errores de login mostrados inline en español debajo del formulario.
- Uso de los helpers existentes de Supabase (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `proxy.ts`).

**Fuera de alcance (para futuras specs):**
- Conexión real de `/activate-account` (queda visual tal como está).
- Recuperación de contraseña.
- Registro/sign up.
- OAuth/social login.
- Roles/permisos granulares más allá de "autenticado/no autenticado".
- Protección en layouts/páginas individual (solo proxy).

## Modelo de datos

_No se introducen nuevas tablas/estructuras de datos. Se reutiliza el modelo de Auth de Supabase (sesión/cookies manejadas por `@supabase/ssr`)._

## Plan de implementación

1. **Preparar entorno.** Verificar variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Confirmar que el proyecto Supabase tiene Auth habilitado con email/password.
2. **Actualizar `proxy.ts` y `lib/supabase/proxy.ts`.** 
   Siguiendo la documentación oficial de Next.js 16 (proxy) y Supabase SSR obtenida vía Context7:
   - **Next.js 16 usa `proxy.ts` (no `middleware.ts`)**. Ya existe en la raíz y delega a `updateSession(request)`.
   - En `lib/supabase/proxy.ts`, mantener `createServerClient` con `cookies.getAll/setAll`, propagando las cookies al `NextResponse` con el patrón Supabase SSR.
   - Llamar `await supabase.auth.getClaims()` lo antes posible para inicializar/refrescar la sesión y permitir escribir las `Set-Cookie` correctamente.
   - Comprobar el usuario con `const { data: { user } } = await supabase.auth.getUser()` para tomar la decisión de redirección.
   - Definir rutas públicas: cualquier ruta cuyo `pathname` empiece con `/login` o `/activate-account`. Los assets estáticos ya están excluidos por el `matcher` de `proxy.ts`.
   - Si **no hay usuario** y la ruta **no es pública** → `return NextResponse.redirect(new URL('/login', request.url))`
   - Si **hay usuario** y la ruta **es pública de auth** (`/login` o `/activate-account`) → `return NextResponse.redirect(new URL('/', request.url))`
   - En cualquier otro caso → `return supabaseResponse` (manteniendo las cookies refrescadas).
   - Ejecutar toda la lógica en el proxy antes de renderizar para evitar bucles de redirección.
3. **Convertir `/login` a cliente/form con lógica real.** Modificar `app/(auth)/login/page.tsx`:
   - Marcar como `"use client"`.
   - Añadir estado para email/password/error/loading.
   - Usar `createClient()` de `lib/supabase/client.ts`.
   - Llamar `supabase.auth.signInWithPassword({ email, password })` al submit.
   - Si éxito → `router.push('/')` o `router.refresh()`.
   - Si error → mostrar mensaje inline en español debajo del botón/formulario.
   - Mantener el diseño visual idéntico al mockup (sin agregar la sección "INGRESO COMO").
4. **Verificar `/activate-account`.** Dejarlo tal como está (visual). No agregar lógica.
5. **Pruebas manuales.** Probar flujos: no autenticado → `/` redirige a `/login`; login correcto → `/`; ya autenticado → `/login` redirige a `/`; ya autenticado → `/activate-account` redirige a `/`; login con error muestra mensaje inline.
6. **Verificación final.** `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Criterios de aceptación

- [ ] Solo email + contraseña. Login usa `signInWithPassword`.
- [ ] Rutas protegidas: todo excepto `(auth)` requiere sesión. `/login` y `/activate-account` son públicas.
- [ ] No autenticado → accede a ruta protegida → redirige a `/login`.
- [ ] Autenticado → accede a `/login` o `/activate-account` → redirige a `/`.
- [ ] Login fallido muestra mensaje de error inline en español debajo del formulario.
- [ ] Diseño de `/login` se mantiene idéntico al mockup (sin sección "INGRESO COMO").
- [ ] `/activate-account` queda sin lógica (solo visual).
- [ ] Protección centralizada en `proxy.ts`/`lib/supabase/proxy.ts`.
- [ ] Usa helpers existentes de Supabase, respeta RLS implícitamente.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** Solo `signInWithPassword`. Suficiente para el caso actual.
- **Sí:** Dejar `/activate-account` visual. Se implementará en otra spec para no agrandar alcance.
- **Sí:** Proteger todo excepto `(auth)`. Sencillo y cubre todas las rutas actuales/futuras.
- **Sí:** Redirecciones bidireccionales (no autenticado→login, autenticado→fuera de auth). Evita páginas confusas.
- **Sí:** Protección centralizada en proxy. Aprovecha refresh de cookies con `getClaims()` ya existente.
- **Sí:** Errores inline en español. Mejor UX, sin toasts extra.
- **No:** Protección solo en páginas. Menor riesgo de olvidos.
- **No:** Conectar activación ahora. Fuera de alcance.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Bucle de redirección entre `/login` y rutas protegidas | Revisar lógica: solo redirigir si ruta no es pública y no hay sesión; si es pública y hay sesión redirigir a `/`. |
| Pérdida de cookies en refresh | Seguir patrón SSR: llamar `getClaims()` temprano y usar `setAll` correctamente (ya implementado). |
| Errores de Supabase poco claros al usuario | Mapear errores comunes a mensajes en español (credenciales inválidas, etc.). |
| `use client` en login rompe algo | Mantener estructura visual idéntica; solo agregar lógica client-side. |

## Qué **no** está en este spec

- Activación de cuenta real.
- Recuperación/restablecimiento de contraseña.
- Registro de usuarios.
- Autenticación con proveedores sociales.
- Protección a nivel de componentes/layouts.
- Cambios a RLS/policies (se asumirán o se harán en spec de DB si necesario).
- Logout UI (si no existe, queda fuera).
