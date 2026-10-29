-- SPEC-10: RLS policies for invitations
create policy "invitations_select_staff_admin"
on public.invitations for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and u.daycare_id = invitations.daycare_id
  )
);

create policy "invitations_insert_staff_admin"
on public.invitations for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and u.daycare_id = invitations.daycare_id
  )
);

create policy "invitations_update_staff_admin"
on public.invitations for update
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and u.daycare_id = invitations.daycare_id
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.status = 'active'
      and u.role in ('admin','staff')
      and u.daycare_id = invitations.daycare_id
  )
);
