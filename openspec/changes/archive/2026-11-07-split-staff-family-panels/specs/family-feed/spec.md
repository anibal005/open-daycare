# Spec Delta

## Purpose

Define el feed de solo lectura que ve un padre: qué publicaciones puede ver, qué datos de cada una recibe (hijo, autor, fotos, contadores) y qué operaciones quedan fuera de su alcance.

## ADDED Requirements

### Requirement: Visibilidad de publicaciones

Un padre SHALL ver únicamente publicaciones de su guardería que no tengan destinatarios (toda la sala) o que incluyan al menos un hijo vinculado a él mediante un vínculo activo. El sistema SHALL ocultar las publicaciones dirigidas solo a hijos de otras familias.

#### Scenario: Publicación de su hijo

- **WHEN** un padre abre el feed y existe una publicación vinculada a un hijo suyo
- **THEN** la publicación aparece en el feed

#### Scenario: Publicación de otro hijo

- **WHEN** existe una publicación dirigida solo a un hijo que no está vinculado al padre
- **THEN** la publicación no aparece y una consulta directa con su sesión tampoco la devuelve

#### Scenario: Publicación para toda la sala

- **WHEN** existe una publicación sin destinatarios
- **THEN** aparece a todos los padres activos de la guardería

### Requirement: Vínculos visibles propios

Dentro de una publicación visible, el padre SHALL ver únicamente los vínculos de sus propios hijos y no SHALL ver los nombres de niños de otras familias.

#### Scenario: Publicación para varios niños

- **WHEN** una publicación está dirigida a dos niños y el padre solo tiene vínculo con uno
- **THEN** el feed muestra el nombre de su hijo y no el del otro

### Requirement: Datos de los hijos

El padre SHALL poder leer el nombre y la sala de los hijos con vínculo activo, y no SHALL poder leer otros niños de la guardería.

#### Scenario: Datos de sus hijos

- **WHEN** el padre abre el feed
- **THEN** el sistema obtiene el nombre y la sala de sus hijos vinculados para el encabezado y los filtros

#### Scenario: Niño ajeno

- **WHEN** el padre consulta directamente un niño que no está vinculado a él
- **THEN** la consulta no devuelve la fila de ese niño

### Requirement: Autor de la publicación

El feed SHALL mostrar el nombre del miembro del staff que publicó. El padre SHALL poder leer nombre, avatar y rol de usuarios `staff`/`admin` activos de su misma guardería, y no SHALL acceder a usuarios de otras guarderías.

#### Scenario: Autor visible

- **WHEN** una publicación fue creada por una maestra de la guardería
- **THEN** el card muestra su nombre real en el subtítulo; el avatar del header es el del niño, según el mockup

#### Scenario: Autor de otra guardería

- **WHEN** el padre consulta un usuario de otra guardería
- **THEN** la consulta no devuelve la fila

### Requirement: Fotos de publicaciones visibles

El padre SHALL ver las fotos de las publicaciones visibles mediante URLs firmadas. No SHALL poder firmar ni descargar fotos de publicaciones que no le son visibles.

#### Scenario: Foto de publicación visible

- **WHEN** una publicación visible tiene fotos
- **THEN** el feed las muestra y sus URLs firmadas resuelven

#### Scenario: Foto de publicación ajena

- **WHEN** el padre intenta obtener una URL firmada de una foto de una publicación que no le es visible
- **THEN** la operación falla

### Requirement: Contadores de solo lectura

El feed SHALL mostrar la cantidad de reacciones y comentarios de cada publicación visible. El padre SHALL poder leer esos contadores, pero no SHALL poder crear, editar ni borrar reacciones o comentarios.

#### Scenario: Contadores visibles

- **WHEN** una publicación visible tiene 3 reacciones y 1 comentario
- **THEN** el card muestra 3 y 1

#### Scenario: Padre intenta reaccionar

- **WHEN** el padre intenta insertar una reacción con su sesión
- **THEN** la operación es rechazada

### Requirement: Filtro por hijo

El feed SHALL ofrecer un filtro por hijo. Con más de un hijo vinculado SHALL incluir "Todos"; con un solo hijo SHALL mostrar solo ese hijo. "Todos" SHALL mostrar todas las publicaciones visibles y elegir un hijo SHALL mostrar solo las publicaciones que lo incluyan o que sean para toda la sala.

#### Scenario: Varios hijos

- **WHEN** el padre tiene dos hijos vinculados y elige uno
- **THEN** el feed muestra solo las publicaciones de ese hijo y las de toda la sala

#### Scenario: Un solo hijo

- **WHEN** el padre tiene un solo hijo vinculado
- **THEN** no se muestra la opción "Todos"

### Requirement: Orden y agrupación por día

El feed SHALL ordenar las publicaciones de la más reciente a la más antigua y agruparlas por día en la zona horaria `America/Argentina/Buenos_Aires`, con el encabezado "HOY" para el día actual.

#### Scenario: Publicaciones de hoy

- **WHEN** el feed tiene publicaciones del día actual
- **THEN** se muestran bajo el encabezado "HOY" en orden descendente por hora

### Requirement: Estados vacío y error

Sin publicaciones visibles, el feed SHALL mostrar un estado vacío. Si la consulta falla, SHALL mostrar un mensaje de error con opción de reintentar. En ningún caso SHALL mostrar publicaciones ajenas como fallback.

#### Scenario: Sin publicaciones

- **WHEN** el padre no tiene publicaciones visibles
- **THEN** el feed muestra un estado vacío

#### Scenario: Error de consulta

- **WHEN** la consulta de publicaciones falla
- **THEN** el feed muestra un mensaje de error y no publicaciones de otras familias

### Requirement: Aislamiento entre familias y guarderías

Con la sesión de un padre, las consultas a `posts`, `post_children`, `post_photos`, `children` y al bucket `post-photos` no SHALL devolver filas de otros niños ni de otras guarderías.

#### Scenario: Probe con la sesión de un padre

- **WHEN** se consultan publicaciones, vínculos, fotos y niños usando la sesión de un padre
- **THEN** solo se obtienen filas de sus hijos, de las publicaciones visibles y de su guardería
