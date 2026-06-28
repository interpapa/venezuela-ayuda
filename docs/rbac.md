# Role-Based Access Control (RBAC)

Para poder escalar la plataforma y permitir el trabajo de muchos moderadores y colaboradores externos sin comprometer la seguridad o la integridad de los datos, hemos implementado un modelo RBAC completo. 

Este modelo reemplaza a las antiguas "listas de correos" (allowlists planas) por permisos atómicos.

## El Modelo de Datos

Nuestro modelo se compone de 4 entidades clave:
1. **Permisos (`permissions`)**: Capacidades atómicas de bajo nivel (ej: `admin.access`, `dedupe.review`, `partners.manage`).
2. **Roles (`roles`)**: Agrupadores lógicos de permisos que se le otorgan a un humano (ej: `admin`, `moderator`, `super_admin`).
3. **Role Permissions (`role_permissions`)**: La tabla que mapea qué rol contiene qué permisos.
4. **User Roles (`user_roles`)**: La tabla que asigna uno o varios roles a un correo electrónico.

### Beneficios
Al separar permisos de roles, el código backend **nunca** verifica si un usuario es "admin" o "super_admin". El código **solamente** verifica si el usuario tiene el permiso necesario (ej: `hasPermission(email, "dedupe.review")`).
Esto significa que el día de mañana podemos inventar un rol "Becario" en la Base de Datos que solo tenga acceso a revisar datos, **sin tener que escribir una sola línea de código**.

## Guía: ¿Cómo crear un permiso nuevo y asignarlo?

Imagina que creamos un nuevo panel de configuración de correos electrónicos y queremos restringirlo.

### 1. Crear el permiso atómico
Ve a la base de datos (o crea una nueva migración SQL) y registra el permiso con un namespace claro:

```sql
insert into permissions (key, description) values
  ('config.emails', 'Capacidad de editar las plantillas de correo de la plataforma');
```

### 2. Englobarlo en uno (o varios) roles
Decidimos que este permiso debe tenerlo el `super_admin` pero además vamos a crear un rol nuevo de `communications`.

```sql
insert into roles (key, description) values
  ('communications', 'Equipo de prensa y correos');

-- Le damos el permiso al rol nuevo
insert into role_permissions (role_key, permission_key) values
  ('communications', 'config.emails'),
  ('super_admin', 'config.emails');
```

### 3. Asignar el rol al usuario
Desde la base de datos (o la Interfaz de Administrador en `/admin/admins`):

```sql
insert into user_roles (user_email, role_key) values
  ('juan@prensa.com', 'communications');
```

### 4. Proteger la superficie en Next.js
En tu Server Action, Controlador de API o Componente de Servidor, importa el sistema RBAC:

```ts
import { hasPermission } from "@/lib/rbac";
import { getAdminEmail } from "@/lib/admin";

export async function updateEmailTemplate(templateId: string, content: string) {
  const email = await getAdminEmail();
  if (!email || !(await hasPermission(email, "config.emails"))) {
    throw new Error("No autorizado");
  }
  
  // Guardar plantilla...
}
```

## Consideraciones
- Un usuario puede tener **múltiples roles**. Sus permisos efectivos son la unión de todos los permisos de todos sus roles.
- La tabla `admin_emails` está obsoleta (legacy). Ya no debes consultarla; usa `hasPermission("admin.access")`.
