# Especificación de base de datos: Invitaciones para vinculación padre/madre-hijo

**ID:** `spec-10-invitaciones-vinculacion-padre-hijo.md`  
**Ubicación:** `specs/database/spec-10-invitaciones-vinculacion-padre-hijo.md`  
**Relacionado con:** `spec-10-vinculacion-padre-hijo-invitacion-resend.md`  
**Tipo:** Migración DDL/DML controlada via `apply_migration`

## 1. Objetivo

Crear la estructura necesaria para gestionar invitaciones de vinculación entre padres/madres/tutores y niños, con código único, expiración, estados y RLS.

## 2. Tabla `public.invitations`

### 2.1 Estructura

| Campo | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `daycare_id` | `uuid` | NO | — | FK a `daycares(id)`. ON DELETE RESTRICT |
| `child_id` | `uuid` | NO | — | FK a `children(id)`. ON DELETE CASCADE |
| `invited_by` | `uuid` | NO | — | FK a `users(id)`. ON DELETE RESTRICT (quien envía la invitación) |
| `full_name` | `text` | NO | — | Nombre y apellido del invitado |
| `email` | `citext` | NO | — | Correo del invitado |
| `relationship` | `text` | NO | — | `mother` \| `father` \| `tutor` |
| `invite_code` | `text` | NO | — | Código único de invitación |
| `status` | `text` | NO | `'pending'` | `pending` \| `accepted` \| `revoked` \| `expired` |
| `expires_at` | `timestamptz` | NO | `now() + interval '7 days'` | Expiración |
| `accepted_at` | `timestamptz` | YES | `NULL` | Fecha de aceptación |
| `accepted_by_user_id` | `uuid` | YES | `NULL` | FK a `users(id)`. ON DELETE SET NULL |
| `revoked_at` | `timestamptz` | YES | `NULL` | Fecha de revocación |
| `revoked_by` | `uuid` | YES | `NULL` | FK a `users(id)`. ON DELETE SET NULL |
| `created_at` | `timestamptz` | NO | `now()` | Creación |
| `updated_at` | `timestamptz` | NO | `now()` | Actualización (trigger) |

### 2.2 Restricciones

- `CONSTRAINT invitations_pkey PRIMARY KEY (id)`
- `CONSTRAINT invitations_invite_code_key UNIQUE (invite_code)`
- `CONSTRAINT invitations_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE`
- `CONSTRAINT invitations_daycare_id_fkey FOREIGN KEY (daycare_id) REFERENCES daycares(id) ON DELETE RESTRICT`
- `CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE RESTRICT`
- `CONSTRAINT invitations_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL`
- `CONSTRAINT invitations_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL`
- `CONSTRAINT invitations_relationship_check CHECK (relationship IN ('mother','father','tutor'))`
- `CONSTRAINT invitations_status_check CHECK (status IN ('pending','accepted','revoked','expired'))`
- `CONSTRAINT invitations_expires_at_check CHECK (expires_at > created_at)`

### 2.3 Índices

- `idx_invitations_child_id` ON `invitations(child_id)`
- `idx_invitations_email_status` ON `invitations(email, status)`
- `idx_invitations_invite_code` ON `invitations(invite_code)` (cubierto por UNIQUE, pero útil para referencia)
- `idx_invitations_daycare_id` ON `invitations(daycare_id)`
- `idx_invitations_pending_by_child_email` ON `invitations(daycare_id, child_id, email)` WHERE `status = 'pending'`

## 3. Trigger `updated_at`

Crear/asegurar función `update_updated_at_column()` si no existe. Crear trigger:

```sql
CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 4. RLS

Habilitar RLS:

```sql
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
```

### Políticas

**SELECT para staff/admin de la guardería**
Solo usuarios con rol `admin` o `staff` que pertenezcan a `daycares` asociadas al `daycare_id` de la invitación pueden ver invitaciones de su guardería.

**INSERT para staff/admin**
Solo `admin` o `staff` de la guardería del niño pueden crear invitaciones. Deben validar que `child_id` pertenece a su guardería.

**UPDATE para staff/admin**
Solo `admin` o `staff` de la guardería pueden actualizar invitaciones (ej. para marcar `revoked`).

**Nota importante:** La validación del código para `/activate-account` **NO** debe hacerse con consulta directa desde cliente usando `anon` key. Debe hacerse exclusivamente desde **Server Actions/Route Handlers** con lógica controlada. No se crearán políticas públicas para leer por `invite_code`.

## 5. Ajustes a `parent_children`

Verificar estructura existente. Al aceptar invitación:

- Crear o actualizar vínculo `(child_id, user_id)` 
- Establecer `relationship` desde invitación
- Establecer `status = 'active'`
- Mantener integridad con FKs existentes

## 6. Migración

**Obligatorio:** Usar `apply_migration` del MCP de Supabase. 

Nombre sugerido: `20251027_create_invitations_table` o siguiendo versión del historial remoto `supabase_migrations.schema_migrations`.

El SQL debe incluir:
- Creación de tabla `invitations` con todas las columnas, constraints e índices
- Extensión `citext` si no está habilitada (verificar)
- Trigger `updated_at`
- Habilitación de RLS y políticas para `admin`/`staff`
- Comentarios descriptivos

**Reglas:**
- No editar migraciones ya aplicadas
- Guardar SQL exacto en `supabase/migrations/`
- Nunca aplicar DDL desde dashboard/`execute_sql`/psql
- `execute_sql` solo para consultas de verificación de solo lectura

## 7. Criterios de aceptación

- [x] Tabla `invitations` creada con estructura correcta
- [x] Constraints e índices aplicados
- [x] Trigger `updated_at` funcional
- [x] RLS habilitado con políticas para `admin`/`staff`
- [ ] Índice parcial para evitar múltiples invitaciones `pending` vigentes por `(daycare_id, child_id, email)`
  > Existe `idx_invitations_pending_by_child_email`, pero **no es `UNIQUE`**, así que no impide duplicados. La Server Action revoca las `pending` antes de insertar, pero dos envíos concurrentes todavía pueden dejar dos invitaciones `pending`.
- [x] Migración versionada en `supabase/migrations/`
- [x] Aplicada vía `apply_migration`
- [x] Sin errores en verificación

> Verificación del 2026-10-30 contra el proyecto remoto: columnas, `citext` en `email`, unique de `invite_code`, trigger `set_invitations_updated_at` y RLS con las tres políticas `invitations_*_staff_admin` confirmados.
