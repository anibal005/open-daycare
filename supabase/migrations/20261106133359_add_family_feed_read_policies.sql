-- SPEC-12 database: lectura del feed para familias (helpers security definer y
-- ocho politicas SELECT aditivas para padres activos).
-- Fuente: specs/database/spec-12-lectura-feed-familia.md
-- Change: split-staff-family-panels (tarea 1.2)
-- Migration: add_family_feed_read_policies

-- 1. Helpers (security definer, stable, search_path = '')
create function public.is_active_parent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role = 'parent'
  );
$$;

create function public.is_parent_of_child(child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_children pc
    join public.children c on c.id = pc.child_id
    join public.rooms r on r.id = c.room_id
    join public.users u on u.id = pc.user_id
    where pc.user_id = (select auth.uid())
      and pc.child_id = $1
      and pc.status = 'active'
      and c.status = 'active'
      and u.status = 'active'
      and u.role = 'parent'
      and r.daycare_id = u.daycare_id
  );
$$;

create function public.can_view_family_post(post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    join public.users u on u.id = (select auth.uid())
    where p.id = $1
      and p.daycare_id = u.daycare_id
      and u.status = 'active'
      and u.role = 'parent'
      and (
        not exists (
          select 1
          from public.post_children pc
          where pc.post_id = p.id
        )
        or exists (
          select 1
          from public.post_children pc
          where pc.post_id = p.id
            and public.is_parent_of_child(pc.child_id)
        )
      )
  );
$$;

create function public.can_view_post_photo(storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_parent()
    and exists (
      select 1
      from public.post_photos pp
      where pp.storage_path = $1
        and public.can_view_family_post(pp.post_id)
    );
$$;

create function public.can_view_staff_member(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users me
    join public.users target on target.id = $1
    where me.id = (select auth.uid())
      and me.status = 'active'
      and target.status = 'active'
      and target.role in ('staff', 'admin')
      and target.daycare_id = me.daycare_id
  );
$$;

-- 2. Grants explicitos
revoke execute on function public.is_active_parent() from public, anon;
revoke execute on function public.is_parent_of_child(uuid) from public, anon;
revoke execute on function public.can_view_family_post(uuid) from public, anon;
revoke execute on function public.can_view_post_photo(text) from public, anon;
revoke execute on function public.can_view_staff_member(uuid) from public, anon;

grant execute on function public.is_active_parent() to authenticated;
grant execute on function public.is_parent_of_child(uuid) to authenticated;
grant execute on function public.can_view_family_post(uuid) to authenticated;
grant execute on function public.can_view_post_photo(text) to authenticated;
grant execute on function public.can_view_staff_member(uuid) to authenticated;

-- 3. Politicas SELECT aditivas (7 en public, 1 en storage.objects)
create policy posts_select_family_parent on public.posts
for select to authenticated
using (public.can_view_family_post(id));

create policy post_children_select_family_parent on public.post_children
for select to authenticated
using (
  public.can_view_family_post(post_id)
  and public.is_parent_of_child(child_id)
);

create policy post_photos_select_family_parent on public.post_photos
for select to authenticated
using (public.can_view_family_post(post_id));

create policy children_select_family_parent on public.children
for select to authenticated
using (
  public.is_active_parent()
  and public.is_parent_of_child(id)
);

create policy users_select_staff_member on public.users
for select to authenticated
using (public.can_view_staff_member(id));

create policy reactions_select_family_parent on public.reactions
for select to authenticated
using (public.can_view_family_post(post_id));

create policy comments_select_family_parent on public.comments
for select to authenticated
using (public.can_view_family_post(post_id));

create policy post_photos_storage_select_family_parent on storage.objects
for select to authenticated
using (
  bucket_id = 'post-photos'
  and public.can_view_post_photo(name)
);
