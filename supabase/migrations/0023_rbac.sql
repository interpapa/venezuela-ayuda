-- 0023 · RBAC completo: permisos atómicos → roles → usuarios
--
-- Reemplaza la autorización basada en la tabla plana admin_emails (y próximamente
-- reviewer_emails) por un modelo completo de Control de Acceso Basado en Roles.

create table if not exists permissions (
  key text primary key,
  description text not null
);

create table if not exists roles (
  key text primary key,
  description text not null
);

create table if not exists role_permissions (
  role_key text references roles(key) on delete cascade,
  permission_key text references permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

create table if not exists user_roles (
  user_email text not null,
  role_key text references roles(key) on delete cascade,
  granted_by text,
  created_at timestamptz not null default now(),
  primary key (user_email, role_key)
);

-- RLS: Only server via service_role can access these tables.
alter table permissions enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;

-- Seed de Permisos Atómicos
insert into permissions (key, description) values
  ('admin.access', 'Acceso básico al panel de administración'),
  ('partners.manage', 'Capacidad de gestionar colaboradores y administradores'),
  ('moderation.write', 'Capacidad de moderar contenido (ocultar, verificar reportes, etc)'),
  ('dedupe.review', 'Acceso a la consola de deduplicación manual'),
  ('api.write', 'Permiso base para inyectar datos a través de la API HUB')
on conflict (key) do nothing;

-- Seed de Roles
insert into roles (key, description) values
  ('super_admin', 'Administrador principal con todos los privilegios'),
  ('admin', 'Administrador estándar y moderador'),
  ('reviewer', 'Revisor especializado en limpieza de datos'),
  ('moderator', 'Moderador de reportes de la comunidad'),
  ('partner', 'Colaborador externo con acceso a la API')
on conflict (key) do nothing;

-- Asignación de permisos a los roles
insert into role_permissions (role_key, permission_key) values
  -- super_admin
  ('super_admin', 'admin.access'),
  ('super_admin', 'partners.manage'),
  ('super_admin', 'moderation.write'),
  ('super_admin', 'dedupe.review'),
  
  -- admin
  ('admin', 'admin.access'),
  ('admin', 'moderation.write'),
  
  -- reviewer
  ('reviewer', 'dedupe.review'),
  
  -- moderator
  ('moderator', 'moderation.write'),
  
  -- partner
  ('partner', 'api.write')
on conflict do nothing;

-- Backfill: Migrar los admins existentes desde admin_emails hacia user_roles
insert into user_roles (user_email, role_key, granted_by, created_at)
select 
  email, 
  case when is_super_admin then 'super_admin' else 'admin' end as role_key,
  added_by,
  created_at
from admin_emails
on conflict (user_email, role_key) do nothing;

-- Registrar migración
insert into applied_migrations (version) values ('0023') on conflict do nothing;
