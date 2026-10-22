-- SPEC-07: first domain table (daycares)
-- Migration: create_daycares

create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint daycares_name_not_blank check (length(trim(name)) > 0)
);

alter table public.daycares enable row level security;

insert into public.daycares (name)
select 'Guardería Sala Soles'
where not exists (
  select 1 from public.daycares where name = 'Guardería Sala Soles'
);
