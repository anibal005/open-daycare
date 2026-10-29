-- SPEC-10: parent_children linking table
create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  relationship text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_children_relationship_check check (relationship in ('mother','father','tutor')),
  constraint parent_children_status_check check (status in ('active','pending')),
  constraint parent_children_child_user_key unique (child_id, user_id)
);

create index idx_parent_children_child_id on public.parent_children (child_id);
create index idx_parent_children_user_id on public.parent_children (user_id);

create trigger set_parent_children_updated_at
  before update on public.parent_children
  for each row
  execute function public.set_updated_at();

alter table public.parent_children enable row level security;

create policy "parent_children_select_staff_admin_parent"
on public.parent_children for select
to authenticated
using (
  exists (
    select 1 from public.users u
    join public.children c on c.id = parent_children.child_id
    join public.rooms r on r.id = c.room_id
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and r.daycare_id = u.daycare_id
  )
  or (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.status = 'active'
        and u.role = 'parent'
        and u.id = parent_children.user_id
    )
  )
);

create policy "parent_children_insert_staff_admin"
on public.parent_children for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    join public.children c on c.id = parent_children.child_id
    join public.rooms r on r.id = c.room_id
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and r.daycare_id = u.daycare_id
  )
);

create policy "parent_children_update_staff_admin"
on public.parent_children for update
to authenticated
using (
  exists (
    select 1 from public.users u
    join public.children c on c.id = parent_children.child_id
    join public.rooms r on r.id = c.room_id
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and r.daycare_id = u.daycare_id
  )
)
with check (
  exists (
    select 1 from public.users u
    join public.children c on c.id = parent_children.child_id
    join public.rooms r on r.id = c.room_id
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and r.daycare_id = u.daycare_id
  )
);
