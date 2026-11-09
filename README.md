# OpenDayCare

Aplicación web para la gestión diaria de una guardería: feed de publicaciones, niños, salas, padres vinculados e invitaciones.

Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase**.

---

## Requisitos

- **Node.js >= 20.9** (el `engines` de Next.js 16 lo exige).
- **npm** (el proyecto trae `package-lock.json`).
- **Acceso a la organización de Supabase** donde vive el proyecto (para las variables de entorno y el MCP).
- Opcional: **Supabase CLI** y **OpenCode** para trabajar con la base de datos y los asistentes de IA.

---

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

Copia la plantilla y completa los valores:

```bash
# bash / zsh / Git Bash
cp .env.template .env.local
```

```powershell
# PowerShell
Copy-Item .env.template .env.local
```

Next.js carga `.env.local` automáticamente (tiene prioridad sobre `.env`). Los archivos `.env*` están en `.gitignore`: **no se commitean**.

| Variable | Dónde se obtiene | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard de Supabase → *Project Settings → API* | Pública, se expone al navegador. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dashboard → *Project Settings → API Keys* | Pública (`sb_publishable_...`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → *Project Settings → API Keys* | **Secreta, solo servidor.** Nunca debe llegar al cliente. |
| `SUPABASE_DB_PASSWORD` | Dashboard → *Project Settings → Database* | Solo para la CLI / administración; la app no la lee. |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) | Necesaria para enviar invitaciones por email. |
| `RESEND_FROM_EMAIL` | Remitente verificado en Resend | Ej.: `OpenDayCare <no-reply@tudominio.com>`. |
| `NEXT_PUBLIC_APP_URL` | URL local o de despliegue | `http://localhost:3000` en desarrollo. |

Si no vas a probar el envío de invitaciones, puedes dejar `RESEND_API_KEY` vacía: el resto de la app funciona igual.

## 3. Base de datos

El proyecto usa un **proyecto remoto de Supabase** (no hay stack local con Docker). Las migraciones ya están aplicadas; no hay que ejecutar nada para levantar la app.

- El historial versionado vive en `supabase/migrations/`.
- Todo cambio de esquema se aplica con la herramienta MCP `apply_migration` y se versiona como archivo nuevo. El flujo completo, la convención de nombres y las prohibiciones están en [`supabase/README.md`](supabase/README.md).

### Usuario de prueba

La migración `seed_staff_user` crea un usuario `staff` para desarrollo:

- **Email:** `anibal@gmail.com`
- **Contraseña:** `123456`

> Solo existe en el proyecto de desarrollo. No replicar en producción. El formulario de login trae `caro@opendaycare.com` por defecto; cámbialo por el email del seed.

## 4. Levantar la app

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin sesión, `proxy.ts` redirige a `/login`.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con Turbopack. |
| `npm run build` | Build de producción. |
| `npm start` | Sirve el build de producción. |
| `npm run lint` | ESLint (flat config en `eslint.config.mjs`). |

No hay script de tests ni de typecheck. Para verificar tipos:

```bash
npx tsc --noEmit
```

---

## Supabase MCP (asistentes de IA)

El proyecto usa el **Supabase MCP Server hospedado** para que el asistente consulte el esquema, aplique migraciones, lea logs y ejecute SQL de verificación. No se configura en el repo: cada persona lo agrega a su configuración **global** de OpenCode (`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "mcp": {
    "supabase": {
      "type": "remote",
      "url": "https://mcp.supabase.com/mcp?project_ref=<project-ref>",
      "enabled": true
    }
  }
}
```

El parámetro `project_ref` limita la conexión a ese proyecto y oculta las herramientas de cuenta. La configuración del proyecto también acota los grupos de herramientas disponibles con `features=database,debugging,development,...`.

### Autenticación (OAuth, por persona)

El MCP **no** usa la sesión de la CLI: usa OAuth 2.1 con tu cuenta de Supabase. Cada integrante del equipo se autentica una vez en su máquina:

```bash
# Ver el estado de los servidores MCP
opencode mcp list

# Autenticar el servidor de Supabase
opencode mcp auth supabase
```

Se abre el navegador: inicia sesión con la cuenta que pertenece a la organización dueña del proyecto y **selecciona esa organización** al autorizar. No hace falta crear ni pegar un token.

Después:

1. Abre una sesión nueva de OpenCode (o recarga) para que cargue las herramientas.
2. Verifica con `opencode mcp list` o pidiéndole al asistente algo simple, por ejemplo: *"Usa el MCP de Supabase para listar las tablas"*.
3. Para revocar las credenciales locales: `opencode mcp logout supabase`.

### Puntos importantes

- **CLI y MCP son autenticaciones distintas.** `supabase login` autentica la CLI; no habilita el MCP. Y al revés.
- Las credenciales OAuth quedan guardadas por OpenCode en la máquina de cada persona. **No se commitean.**
- En CI o entornos sin navegador se usa un **Personal Access Token con scope** en la cabecera `Authorization: Bearer ...`, pasado por variable de entorno. Evita los tokens clásicos (dan acceso total a la cuenta).
- El MCP opera con tus permisos de desarrollador: no lo compartas con usuarios finales ni lo apuntes a producción sin `read_only=true`.

Documentación oficial: <https://supabase.com/docs/guides/getting-started/mcp>

---

## Supabase CLI (login del equipo)

La CLI es **opcional** hoy: las migraciones se aplican con el MCP y el `supabase/README.md` prohíbe por ahora `supabase init`, `supabase link` y `db push`. Se usa para tareas puntuales de administración.

### Instalación

```bash
# global
npm install -g supabase

# o sin instalar nada (siempre la última versión)
npx supabase --version
```

### Login

```bash
supabase login
```

Abre el navegador, inicias sesión con tu cuenta y guarda el token en el almacén de credenciales del sistema. En equipos sin navegador o en CI:

```bash
supabase login --token sbp_xxxxxxxxxxxxxxxx
```

`SUPABASE_ACCESS_TOKEN` tiene prioridad sobre el token guardado, así que también puedes exportarlo en lugar de hacer login:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxxxxx"   # bash
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxxxxxxxxxxxxx"   # PowerShell
```

Comprobar y cerrar sesión:

```bash
supabase projects list   # confirma que el login funciona
supabase logout
```

### Autenticar a todo el equipo

1. En el dashboard de Supabase, invita a cada persona a la **organización** del proyecto (*Organization Settings → Team*).
2. Cada integrante acepta la invitación y ejecuta `supabase login` con **su propia cuenta** (o `opencode mcp auth supabase` si solo necesita el MCP).
3. Los tokens son personales: nadie comparte el suyo ni lo escribe en el repo, en `.env.local` compartido o en un chat.

> El flujo de navegador de `supabase login` genera un token **clásico con acceso total a la cuenta**. Para scripts y CI, crea mejor un token con scope en *Account → Access Tokens* y guárdalo en una variable de entorno.

---

## Estructura del proyecto

```
app/                    Rutas y componentes (App Router)
  (auth)/login          Login
  (auth)/activate-account  Activación de invitaciones
  actions/              Server Actions (invitaciones, activación)
  kid/                  Listado y detalle de niños
  _components/          Componentes compartidos
lib/
  supabase/             Clientes browser/server y refresco de sesión
  email/                Cliente de Resend
proxy.ts                Refresco de sesión + protección de rutas (Next 16)
supabase/migrations/    Migraciones versionadas (fuente de verdad del esquema)
specs/                  Especificaciones de features
specs/database/         Especificaciones de base de datos
pantallas/              Mockups de diseño (fuente de verdad de la UI)
screenshots/            Capturas de referencia
.agents/skills/         Skills de Supabase y Spec Driven Development
```

## Notas de Next.js 16

- El middleware se llama **`proxy.ts`** (no `middleware.ts`).
- `next.config.ts` activa `cacheComponents` y `partialPrefetching`: al usar el cliente de servidor (`cookies()`), el componente debe ir dentro de `<Suspense>` o el segmento declarar `instant = false`.
- Tailwind v4 se integra como loader de Turbopack; no hay `tailwind.config` ni PostCSS.
- Las pantallas se implementan siguiendo los mockups de `pantallas/` (paleta cálida, Fredoka/Nunito).
