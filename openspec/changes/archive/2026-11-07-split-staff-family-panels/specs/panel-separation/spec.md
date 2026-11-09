# Spec Delta

## Purpose

Define cómo la app resuelve el rol de la sesión y aísla el panel del staff del panel de la familia, de modo que cada usuario solo acceda a las rutas y la navegación de su rol.

## ADDED Requirements

### Requirement: Resolución de rol al entrar

El sistema SHALL resolver el rol del usuario autenticado en `/` y redirigirlo al inicio de su área: `staff` o `admin` a `/staff`, `parent` a `/family`.

#### Scenario: Staff entra a la raíz

- **WHEN** un usuario activo con rol `staff` o `admin` abre `/`
- **THEN** el sistema lo redirige a `/staff`

#### Scenario: Padre entra a la raíz

- **WHEN** un usuario activo con rol `parent` abre `/`
- **THEN** el sistema lo redirige a `/family`

#### Scenario: Sesión sin perfil activo

- **WHEN** un usuario autenticado no tiene fila en `public.users` o su `status` no es `active`
- **THEN** el sistema muestra una pantalla de acceso denegado con opción de cerrar sesión y no entra en un bucle de redirecciones

### Requirement: Área de staff protegida

El sistema SHALL permitir `/staff` y todas sus rutas descendientes solo a usuarios activos con rol `staff` o `admin`. Un `parent` que intente entrar SHALL ser redirigido a `/family`.

#### Scenario: Staff abre su área

- **WHEN** un usuario activo con rol `staff` o `admin` abre `/staff`
- **THEN** el sistema renderiza el feed del staff

#### Scenario: Padre intenta abrir el área de staff

- **WHEN** un usuario activo con rol `parent` abre `/staff` o `/staff/children`
- **THEN** el sistema lo redirige a `/family` y no renderiza contenido del staff

### Requirement: Área de familia protegida

El sistema SHALL permitir `/family` y sus rutas descendientes solo a usuarios activos con rol `parent`. Un `staff` o `admin` que intente entrar SHALL ser redirigido a `/staff`.

#### Scenario: Padre abre su área

- **WHEN** un usuario activo con rol `parent` abre `/family`
- **THEN** el sistema renderiza el feed familiar

#### Scenario: Staff intenta abrir el área de familia

- **WHEN** un usuario activo con rol `staff` o `admin` abre `/family`
- **THEN** el sistema lo redirige a `/staff`

### Requirement: Navegación separada por área

Cada área SHALL renderizar su propia navegación. El staff SHALL ver Feed, Niños, Avisos y Mi cuenta, más la acción de crear publicación. La familia SHALL ver Feed, Resumen del día y Mi cuenta, sin creación de publicaciones ni gestión de niños. La visibilidad de la navegación SHALL derivarse del área, no de una consulta de rol en el cliente.

#### Scenario: Padre en su panel

- **WHEN** un usuario `parent` está en `/family`
- **THEN** ve la navegación familiar y no ve "Niños" ni "Nueva publicación"

#### Scenario: Staff en su panel

- **WHEN** un usuario `staff` está en `/staff`
- **THEN** ve la navegación del staff y no ve "Resumen del día" familiar

### Requirement: Destinos no implementados

Las entradas de navegación sin pantalla implementada SHALL mostrarse como no navegables, sin enlaces rotos: "Avisos" y "Mi cuenta" del staff, y "Resumen del día" y "Mi cuenta" de la familia.

#### Scenario: Entrada pendiente

- **WHEN** el usuario intenta activar una entrada pendiente
- **THEN** el sistema no navega a una ruta inexistente y comunica que la sección no está disponible

### Requirement: Ingreso y activación

Después de iniciar sesión o activar una cuenta, el sistema SHALL llevar al usuario a `/`, que resuelve su área. Un usuario autenticado que abra `/login` o `/activate-account` SHALL terminar en el inicio de su área.

#### Scenario: Login de padre

- **WHEN** un padre completa el login con credenciales válidas
- **THEN** termina en `/family`

#### Scenario: Login de staff

- **WHEN** un miembro del staff completa el login con credenciales válidas
- **THEN** termina en `/staff`

### Requirement: URLs de cada panel

El staff SHALL vivir bajo `/staff`: feed en `/staff`, niños en `/staff/children` y perfil en `/staff/children/[id]`. La familia SHALL vivir bajo `/family`. Las URLs anteriores `/kid` dejan de existir.

#### Scenario: Ruta de niños

- **WHEN** un miembro del staff abre `/staff/children`
- **THEN** ve la lista de niños

#### Scenario: Ruta familiar

- **WHEN** un padre abre `/family`
- **THEN** ve el feed familiar
