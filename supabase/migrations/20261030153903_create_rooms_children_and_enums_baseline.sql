-- Baseline reconstruido desde el catalogo real (pg_catalog): estos objetos ya
-- existian en el remoto sin migracion versionada (drift previo). No modifica datos.
-- Origen: specs/database/spec-10-mantenimiento-ninos-y-salas.md (rooms, children)
--         specs/database/spec-10-invitaciones-vinculacion-padre-hijo.md (invitation_status, relationship_type)
--         specs/database/spec-08-tabla-users.md + 07-DB-Schema (child_status, post_type)
-- Migration: create_rooms_children_and_enums_baseline

-- 1. Enums (guardados contra duplicate_object)
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'child_status'
  ) then
    create type public.child_status as enum ('active', 'archived');
  end if;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'relationship_type'
  ) then
    create type public.relationship_type as enum ('father', 'mother', 'guardian');
  end if;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'invitation_status'
  ) then
    create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');
  end if;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'post_type'
  ) then
    create type public.post_type as enum ('meal', 'nap', 'activity', 'achievement', 'photo', 'announcement');
  end if;
exception
  when duplicate_object then null;
end
$$;

-- 2. rooms (FK a daycares)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null
    references public.daycares (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint rooms_name_not_blank check (length(trim(name)) > 0)
);

-- 3. children (FK a rooms)
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.rooms (id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null default current_date,
  medical_notes text,
  allergy_tags text[] default '{}'::text[],
  photo_consent boolean not null default true,
  status public.child_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint children_full_name_not_blank check (length(trim(full_name)) > 0)
);

-- 3b. Constraints de rooms (idempotentes si la tabla ya existia sin ellos)
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint c
    join pg_catalog.pg_class rel on rel.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'rooms' and c.conname = 'rooms_name_not_blank'
  ) then
    alter table public.rooms
      add constraint rooms_name_not_blank check (length(trim(name)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint c
    join pg_catalog.pg_class rel on rel.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'rooms' and c.conname = 'rooms_daycare_id_fkey'
  ) then
    alter table public.rooms
      add constraint rooms_daycare_id_fkey
      foreign key (daycare_id) references public.daycares (id) on delete cascade;
  end if;
end
$$;

-- 3c. Constraints de children (idempotentes si la tabla ya existia sin ellos)
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint c
    join pg_catalog.pg_class rel on rel.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'children' and c.conname = 'children_full_name_not_blank'
  ) then
    alter table public.children
      add constraint children_full_name_not_blank check (length(trim(full_name)) > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint c
    join pg_catalog.pg_class rel on rel.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'children' and c.conname = 'children_room_id_fkey'
  ) then
    alter table public.children
      add constraint children_room_id_fkey
      foreign key (room_id) references public.rooms (id) on delete cascade;
  end if;
end
$$;

-- 4. Trigger de updated_at en children
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class rel on rel.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'children'
      and t.tgname = 'children_set_updated_at'
      and not t.tgisinternal
  ) then
    execute 'create trigger children_set_updated_at before update on public.children for each row execute function public.set_updated_at()';
  end if;
end
$$;

-- 5. RLS (ya versionada por politica en add_rooms_children_policies; se habilita
--    aqui porque no estaba versionada y sin ella las politicas no aplican)
alter table public.rooms enable row level security;
alter table public.children enable row level security;
