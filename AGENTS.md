<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

Next.js 16.4.2 + React 19 + Tailwind CSS v4 (App Router). Single package, no monorepo. This is the "open daycare" app; UI copy and design mockups are in Spanish.

Commands (npm):
- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test or typecheck script exists; verify types with `npx tsc --noEmit`

## Next.js 16 specifics that will bite you

- `next.config.ts` enables `cacheComponents: true` and `partialPrefetching: true` — the cache-components model applies (see `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` before touching data fetching/caching). `experimental.agentFeedback: true` is also on.
- Tailwind v4 is wired as a Turbopack loader rule in `next.config.ts` (`@tailwindcss/turbopack`). There is no PostCSS config; don't add Tailwind v3-style config files.
- Path alias: `@/*` maps to the repo root (`tsconfig.json`).

## pantallas/ — design mockups (source of truth for UI)

- `pantallas/*.dc.html` are runnable design mockups for each screen (login, feed, ninos, etc.). Implement screens in `app/` to match these mockups (layout, colors, fonts — Fredoka/Nunito, warm palette).
- `pantallas/support.js` is GENERATED ("dc-runtime") — do not edit it.
- `screenshots/` holds reference captures of these mockups; `.playwright-mcp/` is Playwright MCP output.

## MCPs

- Playwright: screenshots y cualquier cosa relacionada a Playwright tienen que estar en la carpeta `.playwright-mcp`
- Context7: usaremos este MCP para traer la documentación actualizada del framework
- Supabase: tenemos acceso al MCP de Supabase. Ver configuración y guías en `.agents/skills/supabase/`

## Base de datos y migraciones

- **Todo cambio en la base de datos se hace con una migración versionada** mediante `apply_migration` del MCP de Supabase: DDL (tablas, columnas, constraints, índices, políticas RLS, funciones, grants) y también datos (seeds).
- Nunca se aplica DDL desde el dashboard de Supabase, ni con `execute_sql`, ni con `psql`. `execute_sql` queda reservado para **consultas de verificación de solo lectura**.
- Cada migración aplicada se versiona en el repo como `supabase/migrations/<version>_<snake_case_name>.sql`, con el SQL exacto y la `version` devuelta por el historial remoto (`supabase_migrations.schema_migrations`).
- Las migraciones ya aplicadas no se editan: cualquier ajuste o rollback es un archivo nuevo. No se re-ejecutan a mano.
- El flujo completo, la convención de nombres y las prohibiciones están en `supabase/README.md`.
- **Specs de base de datos**: toda especificación que trate sobre la base de datos (tablas, columnas, constraints, índices, RLS, funciones, migraciones, seeds, relaciones) se crea en `specs/database/`, no en la raíz de `specs/`. Ej.: `specs/database/spec-07-tabla-daycares.md`. Los specs de UI/features van en `specs/`.

## Acceso a la base de datos desde la app (Supabase)

La aplicación consume Supabase con los paquetes oficiales para Next.js: **`@supabase/supabase-js`** y **`@supabase/ssr`**. No se consulta la base desde la app con el MCP, `execute_sql`, `psql` ni llamadas `fetch` manuales al endpoint REST; esas vías quedan solo para migraciones/verificación durante el desarrollo.

Helpers (usar siempre estos, no crear clientes sueltos):

- `lib/supabase/client.ts` — `createClient()` con `createBrowserClient` para Client Components.
- `lib/supabase/server.ts` — `createClient()` asíncrono con `createServerClient` y `cookies()` para Server Components, Server Actions y Route Handlers. Uso: `const supabase = await createClient()`.
- `lib/supabase/proxy.ts` — `updateSession()`: refresca el token con `supabase.auth.getClaims()` y propaga las cookies renovadas.
- `proxy.ts` (raíz) — punto de entrada que invoca `updateSession` con el matcher. En **Next.js 16 el middleware se llama `proxy.ts`**; no crear ni renombrar a `middleware.ts`.

Variables de entorno:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (ignorado por git). Los placeholders viven en `.env.template`.
- La publishable key es pública y puede usarse en el navegador. La `service_role` key y el password de la base **nunca** van en código cliente ni se commitean.

Reglas de uso:

- El acceso a datos respeta **RLS**: cada tabla con RLS habilitado necesita sus políticas creadas por migración versionada (ver sección anterior). Si una consulta devuelve `[]` o `permission denied`, revisar políticas antes que el cliente.
- Con `cacheComponents: true`, el cliente de servidor lee `cookies()`. En páginas y layouts, el componente que lo usa debe ir dentro de `<Suspense>` (o el segmento debe declarar `instant = false` mientras se migra). En Server Actions y Route Handlers no hace falta.
- Escribir consultas con los nombres reales del schema (`daycares`, `users`, etc.); no inventar tablas de ejemplo (`todos`).
- Referencia oficial: guía de Supabase para Next.js en `.agents/skills/supabase/` y https://supabase.com/docs/guides/auth/server-side/nextjs

## Skills instaladas

### Spec Driven Development
- `/spec` - Crear especificaciones
- `/spec-impl` - Hacer implementaciones

### Supabase
- `supabase` - Guía para usar el MCP de Supabase (schemas, migraciones, logs, advisors, configuración de cliente)
- `supabase-postgres-best-practices` - Mejores prácticas de Postgres para Supabase

## Agente: spec-verifier

- Definición: `.opencode/agents/spec-verifier.md` (modo `all`, solo edita archivos bajo `specs/`, incluido `specs/database/`).
- Uso: invocarlo con `@spec-verifier <spec>` (ej.: `@spec-verifier 01-feed-home`, `specs/01-feed-home.md` o `specs/database/spec-07-tabla-daycares.md`). Si no se indica spec, lista `specs/*.md` y `specs/database/*.md` y pregunta cuál verificar.


## Reglas de código

- Usar código limpio, nombres, variables funciones, etc. en inglés.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
