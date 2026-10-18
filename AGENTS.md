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

## Spec Driven Development - Skills

- /spec Usaremos esta habilidad para crear las especificaciones.
- /spec-impl Usaremos esta skill para hacer las implementaciones. 

## Reglas de código

- Usar código limpio, nombres, variables funciones, etc. en inglés.