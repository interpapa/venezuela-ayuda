-- 0030_hospital_supplies.sql
-- Issue #76: Definir contrato HUB para estado de insumos hospitalarios.
-- 
-- Crea la tabla para almacenar el estado operativo de los hospitales (insumos, necesidades).
-- Permite representar necesidades itemizadas usando JSONB y el estado general en 'category'.
-- Incluye validación de frescura y control de acceso (RLS).

create type hospital_status_category as enum ('green', 'yellow', 'red', 'unknown');

create table if not exists hospital_supplies (
  id            uuid primary key default gen_random_uuid(),
  place_name    text not null,                 -- Nombre del hospital
  city          text,
  latitude      double precision,
  longitude     double precision,
  location      geography(Point, 4326) generated always as (
                  case
                    when latitude is not null and longitude is not null
                    then st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
                    else null
                  end
                ) stored,
  
  category      hospital_status_category not null default 'unknown',
  needs         jsonb not null default '[]'::jsonb,  -- [{name, quantity, unit, priority, notes}]
  
  verified      boolean not null default false,      -- false = pendiente de revisión (extraído de imágenes/audio)
  hidden        boolean not null default false,
  
  source        text not null,                       -- fuente del adaptador o reporte
  external_id   text not null,                       -- ID único externo para dedup/upsert
  contact       text,                                -- POC o persona que reporta (PRIVADO)
  
  stale_after   timestamptz,                         -- Fecha de expiración (frescura)
  verified_at   timestamptz,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  
  unique(source, external_id)
);

create index if not exists hospital_supplies_city_idx on hospital_supplies (city);
create index if not exists hospital_supplies_category_idx on hospital_supplies (category);
create index if not exists hospital_supplies_verified_idx on hospital_supplies (verified);

alter table hospital_supplies enable row level security; -- Escrituras solo por service key (vía API ingest)

-- Vista pública: excluye el contacto privado y los no verificados/ocultos.
create or replace view public_hospital_supplies as
  select id, place_name, city, latitude, longitude,
         category, needs,
         source, stale_after, verified_at, updated_at, created_at
  from hospital_supplies
  where verified = true and hidden = false;

grant select on public_hospital_supplies to anon, authenticated;
revoke insert, update, delete on hospital_supplies from anon, authenticated;

insert into applied_migrations (version) values ('0030') on conflict do nothing;
