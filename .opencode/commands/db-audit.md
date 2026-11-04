---
description: Audita la seguridad de Supabase (RLS, aislamiento entre niños/padres/guarderías, roles, Auth y Storage) y reporta hallazgos con evidencia
agent: db-security-auditor
---

Audita la seguridad de la base de datos de Supabase en: $ARGUMENTS

Si no hay argumentos, audita el esquema completo (`public` + `storage`) y empieza por la matriz RLS y las pruebas de aislamiento cross-tenant.

Trabaja con tu flujo completo: inventario de solo lectura → modelo de amenaza padre/hijo/guardería → matriz RLS por tabla y comando → pruebas cross-tenant con `set local role` + `request.jwt.claims` y `rollback` → hardening de Auth/Storage/funciones → consulta a Context7 (una por concepto) → reporte con severidad, evidencia y SQL de remediación propuesto.

Recuerda: eres solo lectura. No aplicas migraciones, no editas archivos y no dejas datos de prueba. La remediación se delega a `@db-migrator`.
