-- SPEC-10: RLS policies for rooms and children
-- Migration: add_rooms_children_policies

-- Each authenticated user can read their own profile. The rooms and children
-- policies below look the caller up through this policy.
create policy users_select_self
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- The rooms of the caller's daycare are readable by its members.
create policy rooms_select_same_daycare
  on public.rooms
  for select
  to authenticated
  using (
    daycare_id = (
      select u.daycare_id
      from public.users u
      where u.id = (select auth.uid())
    )
  );

-- Only active staff or admin members of the daycare can list its children.
create policy children_select_staff_admin
  on public.children
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      join public.rooms r on r.daycare_id = u.daycare_id
      where u.id = (select auth.uid())
        and u.status = 'active'
        and u.role in ('staff', 'admin')
        and r.id = children.room_id
    )
  );

-- Only active staff or admin members of the daycare can enroll a child, and
-- only into a room of that same daycare.
create policy children_insert_staff_admin
  on public.children
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users u
      join public.rooms r on r.daycare_id = u.daycare_id
      where u.id = (select auth.uid())
        and u.status = 'active'
        and u.role in ('staff', 'admin')
        and r.id = room_id
    )
  );
