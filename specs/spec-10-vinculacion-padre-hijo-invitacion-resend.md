# Especificación: Vinculación de padre/madre a hijo con invitación por correo (Resend)

**ID:** `spec-10-vinculacion-padre-hijo-invitacion-resend.md`  
**Ubicación:** `specs/spec-10-vinculacion-padre-hijo-invitacion-resend.md`  
**Relacionado con:** `spec-05-modal-vincular-padre.md`, `spec-03-login-activar-cuenta.md`, `app/kid/[id]/page.tsx`, `app/_components/link-parent-modal.tsx`, `app/(auth)/activate-account/page.tsx`  
**Tecnologías:** Next.js 16 (App Router), TypeScript, Supabase (Auth + DB + RLS), [Resend](https://resend.com/) + paquete `resend`

## 1. Objetivo

Permitir al personal de la guardería (roles `admin` o `staff`) enviar una invitación por correo electrónico desde la ficha del niño (`/kid/[id]`) para vincular un padre/madre/tutor. 

El flujo debe:

1. Desde el modal "Vincular padre/madre" (`LinkParentModal`) completar: **Nombre y apellido**, **Correo electrónico**, **Parentesco** (`Mamá` / `Papá` / `Tutor/a`).
2. Generar un **nuevo código de invitación** único por envío, con fecha de expiración (7 días) y asociarlo a `child_id`, `daycare_id`, `email`, `full_name`, `relationship` e `invited_by` (usuario que invita).
3. **Enviar un correo** con el código de invitación y un enlace/CTA hacia `/activate-account` utilizando **Resend** (ya configurado).
4. Registrar la invitación en base de datos con estado `pending`. El padre/madre vinculado debe aparecer en `Padres vinculados` con estado **"INVITACIÓN ENVIADA" / pendiente**.
5. Permitir al invitado **activar su cuenta** desde `/activate-account` validando **código + email** (prellenados desde la invitación), creando/activando su usuario con **Supabase Auth** (cuenta directa), completando su perfil (`users`), creando el vínculo `parent_children` en estado `active` y marcando la invitación como `accepted` (consumida).

## 2. Contexto actual

- **Ficha del niño** (`app/kid/[id]/page.tsx`): muestra `LinkedParents` con los padres ya vinculados (`parent_children` + `users`). Tiene el botón "Vincular otro padre" que renderiza `LinkParentModal`.
- **Modal vincular padre** (`app/_components/link-parent-modal.tsx`): actualmente genera `inviteCode` con `generateInviteCode()` y al enviar (`onSubmit`) simplemente cierra el modal. **Aún no persiste, ni envía correo.**
- **Activar cuenta** (`app/(auth)/activate-account/page.tsx`): UI estática con campos para código, email, contraseña. Falta lógica real de validación, consumo de invitación y creación de cuenta.
- **Tipos** (`lib/children.ts`): `ParentStatus = "active" | "pending"`, `PARENT_STATUS_META.pending = "invitación enviada"`.
- **Clientes Supabase**: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` (seguir el patrón existente).
- **Convención migraciones**: usar `apply_migration` del MCP de Supabase. Crear `supabase/migrations/<version>_<snake_case_name>.sql`. Nunca editar migraciones ya aplicadas. Ver `supabase/README.md`.

## 3. Reglas de negocio

- **Permisos:** Solo usuarios con rol `admin` o `staff` pertenecientes a la guardería del niño pueden enviar invitaciones.
- **Reenvío:** Si ya existe una invitación `pending` no expirada para el mismo `(child_id, email)`, se **genera un nuevo código**, se marca la invitación anterior como `revoked` (o se reemplaza), se crea una nueva invitación `pending` con `expires_at = now() + interval '7 days'` y se reenvía el correo con el nuevo código.
- **Activación:** Cuenta directa. No se requiere confirmación por email de Supabase Auth. Se crea el usuario y se activa inmediatamente.
- **Checkbox fotográfico:** No se agrega al modal de vinculación. No se maneja en este flujo.
- **Códigos:** Únicos, legibles (6-8 caracteres alfanuméricos). Case-insensitive en validación. Expiran a 7 días. Una vez `accepted` o `revoked` no reutilizables.
- **Email:** Se envía siempre con el nuevo código generado en cada envío/reenvío.

## 4. Flujo funcional

### 4.1 Enviar invitación (desde ficha del niño)

**Trigger UI:** Modal `LinkParentModal` -> botón "Enviar invitación"

**Pasos:**

1. **Cliente valida**: nombre (no vacío), email válido, parentesco seleccionado.
2. **Llamada a Server Action** `inviteParentToChild` (recomendado).
   - Input: `{ childId, fullName, email, relationship }`
3. **Servidor valida permisos**: usuario autenticado debe tener rol `admin` o `staff` y pertenecer a la guardería del niño (`children.daycare_id`).
4. **Obtener contexto**: Verificar niño existe y está activo. Obtener `daycare_id`.
5. **Generar código único**: Reutilizar/fortalecer `lib/invite-code.ts`. Verificar unicidad en `invitations.invite_code`.
6. **Manejar invitaciones pendientes**: Buscar invitación `pending` no expirada para `(child_id, email)`. Si existe, marcarla como `revoked` con `revoked_at = now()` y `revoked_by = invited_by`.
7. **Crear registro** en `invitations` con estado `pending`, `expires_at = now() + interval '7 days'`, `invite_code` nuevo.
8. **Enviar correo con Resend**:
   - Remitente: `OpenDayCare <no-reply@<dominio-verificado>>` (Resend ya configurado)
   - Destinatario: `email`
   - Asunto: `Invitación para seguir el día de [Nombre del niño]`
   - Body: HTML + texto plano con código, enlace a `/activate-account?code=...&email=...` e instrucciones
9. **Respuesta**: Éxito -> cerrar modal, mostrar feedback "Invitación enviada a [email]". Refrescar datos para mostrar estado `pending`.
10. **Manejo de errores**: Si falla el envío de Resend, marcar la invitación como `revoked` o eliminarla y devolver error al usuario.

### 4.2 Activación de cuenta (desde `/activate-account`)

**URL esperada:** `/activate-account?code=XXXXXX&email=correo@ejemplo.com`

**Pasos:**

1. **Carga inicial**: Leer `code` y `email` desde `searchParams`. Prellenar campos si vienen presentes.
2. **Validación de invitación (server)**:
   - Buscar `invitations` por `invite_code` (case-insensitive)
   - Verificar `status = 'pending'`
   - Verificar `expires_at > now()` 
   - Verificar `email` coincide (case-insensitive)
   - Verificar `child_id` y `daycare_id` válidos
3. **Mostrar contexto**: Avatar inicial del niño, nombre del niño + sala
4. **Formulario**:
   - Código de invitación (prellenado/validado)
   - Email (prellenado)
   - Crear contraseña (validación básica)
5. **Submit (Server Action)** `activateAccountFromInvite`:
   - Validar contraseña
   - Validar invitación nuevamente
   - Crear usuario en Supabase Auth (cuenta directa, sin requerir confirmación por email) usando service role desde server
   - Crear/actualizar registro en `public.users` con `id = auth.user.id`, `full_name = invitations.full_name`, `email`, `role = 'parent'`, `daycare_id`
   - Crear vínculo en `parent_children`: `(child_id, user_id, relationship, status: 'active')`. Si ya existe, actualizar a `active`
   - Marcar invitación: `status = 'accepted'`, `accepted_at = now()`, `accepted_by_user_id = user.id`
   - Redirigir a `/login` con mensaje "Cuenta activada. Iniciá sesión."

## 5. Integración con Resend

### 5.1 Instalación
```bash
npm install resend
```

### 5.2 Variables de entorno
Agregar a `.env.template`:
```env
RESEND_API_KEY=
RESEND_FROM_EMAIL="OpenDayCare <no-reply@tudominio.com>"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Ya configurado en el proyecto. Solo documentar en `.env.template`.

### 5.3 Archivos
- `lib/email/resend.ts` - Cliente Resend
- `lib/email/templates/invite-parent.ts` - Template HTML para correo de invitación

## 6. Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `specs/spec-10-vinculacion-padre-hijo-invitacion-resend.md` | Crear | Esta especificación |
| `specs/database/spec-10-invitaciones-vinculacion-padre-hijo.md` | Crear | Especificación DB |
| `supabase/migrations/<version>_create_invitations_table.sql` | Crear (via apply_migration) | Migración versionada |
| `lib/invite-code.ts` | Verificar/ajustar | Generación de códigos únicos |
| `lib/email/resend.ts` | Crear | Cliente Resend |
| `lib/email/templates/invite-parent.ts` | Crear | Template de correo |
| `app/actions/invite-parent.ts` | Crear | Server Action para enviar invitación |
| `app/actions/activate-invite.ts` | Crear | Server Action para activar cuenta |
| `app/_components/link-parent-modal.tsx` | Modificar | Conectar a Server Action, loading, errores |
| `app/(auth)/activate-account/page.tsx` | Modificar | Leer query params, validar y activar cuenta |
| `.env.template` | Modificar | Agregar variables de Resend |

## 7. Criterios de aceptación

### Desde ficha del niño (`/kid/[id]`)
- [ ] Solo usuarios con rol `admin` o `staff` pueden enviar invitaciones
- [ ] Al enviar, se crea/gestiona invitación correctamente
- [ ] Si hay invitación pendiente, se genera nuevo código, se revoca la anterior y se reenvía
- [ ] Se envía correo vía Resend
- [ ] Modal se cierra con feedback de éxito
- [ ] En `Padres vinculados` aparece el invitado con estado **PENDIENTE** / "invitación enviada"

### Activación (`/activate-account`)
- [ ] Lee `code` y `email` de query params y prellena campos
- [ ] Valida invitación: existe, pending, no expirada, email coincide
- [ ] Crea usuario en Auth directamente (cuenta directa)
- [ ] Crea registro en `users` con rol `parent`
- [ ] Crea vínculo `parent_children` activo
- [ ] Marca invitación como `accepted`
- [ ] Redirige a `/login` con mensaje de éxito
- [ ] No permite usar código ya aceptado/revocado/expirado

### Técnico
- [ ] Migración aplicada con `apply_migration` y versionada en repo
- [ ] RLS configurado correctamente
- [ ] Variables de entorno documentadas en `.env.template`
- [ ] `resend` instalado
- [ ] Sin errores TypeScript (`npx tsc --noEmit`)
- [ ] Sigue patrones de Supabase helpers existentes
- [ ] Código en inglés para lógica, UI en español
