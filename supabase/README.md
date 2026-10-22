# Migraciones de Supabase

Este directorio es el historial versionado de las migraciones aplicadas al proyecto Supabase. Cada archivo en `migrations/` corresponde a una migración ya aplicada y registrada en `supabase_migrations.schema_migrations`; el repositorio —no la base de datos— es la fuente de verdad del esquema.

## Flujo de una migración nueva

1. Redactar el SQL de la migración (DDL y, si aplica, datos).
2. Ejecutar `list_migrations` para ver el último `version` aplicado.
3. Aplicar la migración con la herramienta MCP `apply_migration({ name, query })`.
4. Capturar la `version` que devuelve `apply_migration`.
5. Crear `supabase/migrations/<version>_<name>.sql` con el SQL exacto que se aplicó.
6. Verificar el resultado con `list_tables` + `get_advisors`.

## Convención de nombre

```
supabase/migrations/<version>_<snake_case_name>.sql
```

- `<version>` debe ser **idéntica** a `supabase_migrations.schema_migrations.version` para esa migración; se toma de la respuesta de `apply_migration`, nunca se inventa.
- `<snake_case_name>` es el mismo `name` lógico usado al aplicar la migración (por ejemplo `create_daycares`).
- Un archivo por migración. No se agrupan varias migraciones en un archivo.

## Prohibiciones

- **No** se ejecuta DDL desde el dashboard, ni con `execute_sql`, ni con `psql`: todo el DDL entra por `apply_migration`.
- **No** se editan migraciones ya aplicadas. Cualquier cambio de esquema es un archivo nuevo.
- **No** hay migraciones `down`: el rollback se hace aplicando una migración nueva que revierta el cambio.
- **No** se re-ejecuta un archivo a mano. Las migraciones se aplican una sola vez; solo los bloques de seed escritos de forma idempotente pueden repetirse.
- **No** se usa `supabase init`, `supabase/config.toml`, `supabase link` ni `db push` por ahora: requieren la CLI y, para desarrollo local, Docker.

## Verificación

Para comprobar que el historial remoto coincide con los archivos del repo:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

## Avisos esperados

La tabla `public.daycares` tiene RLS habilitado y ninguna política: el acceso queda denegado para `anon` y `authenticated` hasta que exista la spec de auth/lectura. Por eso `get_advisors("security")` reporta `rls_enabled_no_policy` (`INFO`) para `daycares`; es un aviso informativo esperado, no un bloqueo. El advisor `rls_disabled_in_public` no aparece para esta tabla.
