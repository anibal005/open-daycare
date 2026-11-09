# Tasks

## 1. Base de datos: lectura para familias

- [x] 1.1 Crear `specs/database/spec-12-lectura-feed-familia.md` con los 5 helpers, las 8 políticas, la matriz tabla × comando × rol y los probes de aislamiento. Verificación: el spec nombra cada helper y política del diseño (`is_active_parent`, `is_parent_of_child`, `can_view_family_post`, `can_view_post_photo`, `can_view_staff_member`; `posts`, `post_children`, `post_photos`, `children`, `users`, `reactions`, `comments`, `storage.objects`) y pasa una lectura completa sin requisitos sin verificar.
- [x] 1.2 Preparar la migración `add_family_feed_read_policies` y aplicarla con `@db-migrator`; guardar el archivo en `supabase/migrations/<version>_add_family_feed_read_policies.sql` con la `version` devuelta por el historial remoto. Verificación: la versión aparece en `supabase_migrations.schema_migrations`, `pg_policies` muestra las 8 políticas nuevas y `pg_proc` muestra los 5 helpers con `prosecdef = true` y `proconfig` incluyendo `search_path=`.
- [x] 1.3 Verificar grants de los helpers: `revoke execute from public, anon` y `grant execute to authenticated`. Verificación: `has_function_privilege('anon', ...)` devuelve `false` y `has_function_privilege('authenticated', ...)` devuelve `true` para los 5 helpers.
- [x] 1.4 Ejecutar probes de aislamiento con la sesión del padre de prueba (transacciones con `begin; set local role authenticated; set local request.jwt.claims; ...; rollback;`): post de su hijo visible, post de otra familia oculto, post de otra guardería oculto, `post_children` solo con sus hijos, `children` solo su hijo, autor staff legible, autor de otra guardería ilegible, ruta de Storage de post visible firmable y de post ajeno rechazada, `INSERT` en `reactions`/`comments` rechazado. Verificación: cada probe devuelve el resultado esperado y la transacción termina en `rollback` sin dejar filas.
- [x] 1.5 Correr `get_advisors` y una auditoría con `@db-security-auditor`. Verificación: no aparecen hallazgos Críticos/Altos nuevos; `rls_enabled_no_policy` de `public.daycares` se documenta como aviso esperado.

## 2. Perfil, rutas y guards

- [x] 2.1 Crear `lib/session-profile.ts` con `getSessionProfile()` memoizado con `cache()` de React, tipos de rol/estado y helpers `isStaffProfile` / `isParentProfile`. Verificación: `npx tsc --noEmit` pasa y el módulo no importa `service_role` ni usa metadata de Auth para el rol.
- [x] 2.2 Crear `app/page.tsx` como resolver de rol y `app/access-denied/page.tsx` con mensaje y botón de cerrar sesión, fuera de los layouts de área. Verificación: con cada cuenta de prueba, `/` termina en `/staff` o `/family`; una sesión sin perfil activo termina en `/access-denied` sin loop (una sola redirección en la barra de direcciones).
- [x] 2.3 Mover el panel del staff: `app/page.tsx` → `app/staff/page.tsx`, `app/kid/page.tsx` → `app/staff/children/page.tsx`, `app/kid/[id]/page.tsx` → `app/staff/children/[id]/page.tsx`; eliminar `app/kid`. Verificación: `grep -R "\"/kid" app lib` no devuelve rutas activas y `/staff/children` lista niños.
- [x] 2.4 Actualizar `href`s y comentarios que citan rutas viejas (`kid-card.tsx`, link "Volver a Niños", `lib/posts-data.ts`, `app/actions/invite-parent.ts`, `create-post-modal.tsx`). Verificación: `grep -R "app/kid\|/kid/" app lib` solo devuelve referencias históricas justificadas y `npx tsc --noEmit` pasa.
- [x] 2.5 Crear `app/staff/layout.tsx` con guard `staff`/`admin`, `instant = false` y el shell del staff. Verificación: un `parent` que abre `/staff` o `/staff/children` termina en `/family` sin renderizar contenido del staff.
- [x] 2.6 Crear `app/family/layout.tsx` con guard `parent`, `instant = false` y el shell familiar. Verificación: un usuario `staff`/`admin` que abre `/family` termina en `/staff`.
- [x] 2.7 Extraer `app/_components/sidebar-shell.tsx`, crear `staff-sidebar.tsx`, `family-sidebar.tsx` y `sign-out-button.tsx`; retirar `sidebar.tsx`. Los ítems "Avisos", "Mi cuenta", "Resumen del día" quedan como `<span aria-disabled>`. Verificación: cada rol ve solo su navegación, no hay `href="#"` en sidebars (`grep`) y el logout funciona desde ambas áreas.
- [x] 2.8 Reemplazar la navegación cliente de login/logout por navegación completa (`window.location.assign`) y eliminar la lectura de rol en el cliente. Verificación: iniciar sesión como staff, cerrar sesión y entrar como padre no muestra el shell ni datos del usuario anterior.
- [x] 2.9 Actualizar los specs legacy que documentan rutas (`specs/spec-01-feed-home.md`, `specs/spec-02-ninos-perfil.md`, `specs/spec-09-autenticacion-y-proteccion-de-rutas.md`) para que apunten a `/staff`, `/staff/children` y `/family`. Verificación: `grep -R "\`/kid\|\"/kid\|(/kid" specs/*.md` no devuelve rutas vigentes del panel.

## 3. Feed familiar

- [x] 3.1 Crear `lib/family-posts.ts` con `FamilyFeedPost`, `FamilyFeedDay` y los helpers de encabezado/orden. Verificación: `npx tsc --noEmit` pasa y los tipos no reutilizan `FeedPost` del staff.
- [x] 3.2 Implementar `lib/family-feed-data.ts`: query con `author:users!posts_author_id_fkey`, vínculos propios, fotos, contadores, firma de URLs solo de posts visibles y agrupación por día en `America/Argentina/Buenos_Aires`. Verificación: con la sesión del padre de prueba el feed muestra publicaciones de su hijo y de toda la sala, ninguna de otra familia, y las URLs firmadas de sus fotos responden 200.
- [x] 3.3 Crear `app/family/page.tsx` con saludo "Hola, {nombre}", chips por hijo, "Todos" solo con más de un hijo, encabezados de día, `<Suspense>` y estados vacío/error. Verificación: con el padre de prueba (un solo hijo) no aparece "Todos"; `?child=<id>` muestra solo posts de ese hijo y de toda la sala; un `child` ajeno se trata como "Todos" y no revela datos.
- [x] 3.4 Crear `app/_components/family-post-card.tsx` con header de hijo o anuncio, subtítulo `HH:mm · autor · Sala`, badges reutilizados, fotos y contadores estáticos. Verificación: el card no contiene botones ni links de Editar/audiencia; los contadores son texto y la card se renderiza sin foto cuando la firma falla.
- [x] 3.5 Comparar la pantalla con `references/pantallas/familia-feed.dc.html` usando Playwright MCP y guardar capturas en `.playwright-mcp/`. Verificación: layout, tipografías, colores, chips y agrupación coinciden; las diferencias deliberadas (autor sin "Maestra", card sin link) quedan anotadas en el resumen de la tarea.
- [x] 3.6 Ajustar `revalidatePath` en `create-post.ts` (`/staff` y `/family`) y `invite-parent.ts` (`/staff/children/${childId}`). Verificación: crear una publicación como staff se ve al recargar `/staff` y `/family`; invitar a un padre refresca el perfil del niño en la ruta nueva.

## 4. Verificación de integración

- [x] 4.1 Correr `npm run lint`, `npx tsc --noEmit` y `npm run build`. Verificación: los tres terminan sin errores.
- [x] 4.2 Recorrer la matriz manual: staff → `/staff`, `/staff/children`, `/staff/children/[id]`; padre → `/family`; staff en `/family` → `/staff`; padre en `/staff` → `/family`; sesión sin perfil → `/access-denied` + logout. Verificación: cada caso termina en la URL esperada y sin errores de consola.
- [x] 4.3 Invocar `@accessibility-checker` sobre `app/family/**` y los sidebars nuevos. Verificación: se aplican solo correcciones seguras (semántica, labels, foco, teclado) y se reportan las que cambian el diseño.
- [x] 4.4 Invocar `@react-best-practices` sobre `lib/session-profile.ts`, `lib/family-feed-data.ts` y `app/family/**`. Verificación: recomendaciones aceptadas aplicadas y `npm run lint` + `npx tsc --noEmit` siguen pasando.
- [x] 4.5 Revisar el cumplimiento de `specs/panel-separation/spec.md` y `specs/family-feed/spec.md` escenario por escenario. Verificación: cada escenario tiene evidencia (captura, probe o comportamiento observado) y no quedan requisitos sin cubrir.

## Workflow follow-up

- Archivar el change cuando la revisión del proyecto esté aprobada.
- Verificar el resultado archivado y el estado de `openspec list --specs`.
