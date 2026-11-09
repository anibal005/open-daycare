-- SPEC-11 database: feed de publicaciones del staff, ninos etiquetados, fotos,
-- reacciones y comentarios.
-- Fuente: specs/database/spec-11-posts-fotos-reacciones-comentarios.md
-- Migration: create_posts_feed_tables

-- 1. Enum post_type
-- El enum ya existia con 6 valores (migracion baseline 20261030153903);
-- se agrega 'mood' antes de 'photo' para respetar el orden del spec.
alter type public.post_type add value if not exists 'mood' before 'photo';

-- 2. Funciones auxiliares (security invoker, sin escalar privilegios)
create function public.current_daycare_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select u.daycare_id
  from public.users u
  where u.id = (select auth.uid());
$$;

create function public.is_active_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('staff', 'admin')
  );
$$;

-- 3. Tablas
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null
    references public.daycares (id) on delete cascade,
  author_id uuid not null
    references public.users (id) on delete cascade,
  room_id uuid
    references public.rooms (id) on delete set null,
  type public.post_type not null,
  title text,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_title_not_blank
    check (title is null or length(trim(title)) > 0),
  constraint posts_body_not_blank
    check (length(trim(body)) > 0),
  constraint posts_body_max_length
    check (char_length(body) <= 2000)
);

create table public.post_children (
  post_id uuid not null
    references public.posts (id) on delete cascade,
  child_id uuid not null
    references public.children (id) on delete cascade,
  constraint post_children_pkey primary key (post_id, child_id)
);

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.posts (id) on delete cascade,
  storage_path text not null,
  alt text,
  width int,
  height int,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint post_photos_storage_path_key unique (storage_path),
  constraint post_photos_position_non_negative check (position >= 0),
  constraint post_photos_width_positive check (width is null or width > 0),
  constraint post_photos_height_positive check (height is null or height > 0),
  constraint post_photos_post_id_position_key unique (post_id, position)
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.posts (id) on delete cascade,
  user_id uuid not null
    references public.users (id) on delete cascade,
  type text not null default 'love'
    constraint reactions_type_check check (type in ('love')),
  created_at timestamptz not null default now(),
  constraint reactions_one_per_user unique (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.posts (id) on delete cascade,
  author_id uuid not null
    references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_body_not_blank
    check (length(trim(body)) > 0),
  constraint comments_body_max_length
    check (char_length(body) <= 1000)
);

-- 4. Indices
create index posts_daycare_id_published_at_idx
  on public.posts (daycare_id, published_at desc);
create index posts_author_id_idx on public.posts (author_id);
create index posts_room_id_idx on public.posts (room_id) where room_id is not null;

create index post_children_child_id_idx on public.post_children (child_id);

create index reactions_user_id_idx on public.reactions (user_id);

create index comments_post_id_created_at_idx
  on public.comments (post_id, created_at);

-- 5. Triggers updated_at (reutiliza public.set_updated_at de SPEC-08)
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- 6. RPC transaccional create_post
create function public.create_post(
  p_id uuid,
  p_type public.post_type,
  p_body text,
  p_child_ids uuid[] default '{}'::uuid[],
  p_photos jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_daycare_id uuid := public.current_daycare_id();
  v_photo_count int := coalesce(jsonb_array_length(p_photos), 0);
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_daycare_id is null or not public.is_active_staff() then
    raise exception 'create_post_not_authorized' using errcode = '42501';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'create_post_body_required' using errcode = '23514';
  end if;

  if v_photo_count > 2 then
    raise exception 'create_post_too_many_photos' using errcode = '23514';
  end if;

  if v_photo_count > 0 then
    if exists (
      select 1
      from jsonb_array_elements(p_photos) as photo
      where photo->>'storage_path' is null
         or (photo->>'storage_path') not like
            v_daycare_id::text || '/' || p_id::text || '/%'
    ) then
      raise exception 'create_post_invalid_storage_path' using errcode = '23514';
    end if;
  end if;

  insert into public.posts (id, daycare_id, author_id, type, body)
  values (p_id, v_daycare_id, (select auth.uid()), p_type, v_body);

  if p_child_ids is not null and cardinality(p_child_ids) > 0 then
    insert into public.post_children (post_id, child_id)
    select p_id, child_id
    from unnest(p_child_ids) as child_id
    on conflict do nothing;
  end if;

  if v_photo_count > 0 then
    insert into public.post_photos (
      post_id, storage_path, alt, width, height, position
    )
    select
      p_id,
      photo->>'storage_path',
      nullif(btrim(coalesce(photo->>'alt', '')), ''),
      (photo->>'width')::int,
      (photo->>'height')::int,
      (ordinality - 1)::int
    from jsonb_array_elements(p_photos) with ordinality as t(photo, ordinality);
  end if;

  return p_id;
end;
$$;

revoke execute on function
  public.create_post(uuid, public.post_type, text, uuid[], jsonb)
  from public, anon;
grant execute on function
  public.create_post(uuid, public.post_type, text, uuid[], jsonb)
  to authenticated;

-- 7. RLS
alter table public.posts enable row level security;
alter table public.post_children enable row level security;
alter table public.post_photos enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;

-- posts
create policy posts_select_staff_admin on public.posts
for select to authenticated
using (
  public.is_active_staff()
  and daycare_id = public.current_daycare_id()
);

create policy posts_insert_staff_admin on public.posts
for insert to authenticated
with check (
  public.is_active_staff()
  and daycare_id = public.current_daycare_id()
  and author_id = (select auth.uid())
);

-- post_children
create policy post_children_select_staff_admin on public.post_children
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_children.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy post_children_insert_staff_admin on public.post_children
for insert to authenticated
with check (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_children.post_id
      and p.daycare_id = public.current_daycare_id()
  )
  and exists (
    select 1
    from public.children c
    join public.rooms r on r.id = c.room_id
    where c.id = post_children.child_id
      and c.status = 'active'
      and r.daycare_id = public.current_daycare_id()
  )
);

-- post_photos
create policy post_photos_select_staff_admin on public.post_photos
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy post_photos_insert_staff_admin on public.post_photos
for insert to authenticated
with check (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

-- reactions (solo esquema por ahora)
create policy reactions_select_staff_admin on public.reactions
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = reactions.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy reactions_insert_staff_admin on public.reactions
for insert to authenticated
with check (
  public.is_active_staff()
  and user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = reactions.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy reactions_delete_own on public.reactions
for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = reactions.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

-- comments (solo esquema por ahora)
create policy comments_select_staff_admin on public.comments
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);

create policy comments_insert_staff_admin on public.comments
for insert to authenticated
with check (
  public.is_active_staff()
  and author_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and p.daycare_id = public.current_daycare_id()
  )
);
