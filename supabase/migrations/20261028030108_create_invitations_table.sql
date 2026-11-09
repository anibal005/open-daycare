-- SPEC-10: invitations for parent-child linking
-- Migration: create_invitations_table

create extension if not exists citext;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id) on delete restrict,
  child_id uuid not null references public.children(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete restrict,
  full_name text not null,
  email citext not null,
  relationship text not null,
  invite_code text not null,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by_user_id uuid references public.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_relationship_check check (relationship in ('mother','father','tutor')),
  constraint invitations_status_check check (status in ('pending','accepted','revoked','expired')),
  constraint invitations_expires_at_check check (expires_at > created_at),
  constraint invitations_invite_code_key unique (invite_code)
);

create index idx_invitations_child_id on public.invitations (child_id);
create index idx_invitations_email_status on public.invitations (email, status);
create index idx_invitations_daycare_id on public.invitations (daycare_id);
create index idx_invitations_pending_by_child_email on public.invitations (daycare_id, child_id, email) where status = 'pending';

create trigger set_invitations_updated_at
  before update on public.invitations
  for each row
  execute function public.set_updated_at();

alter table public.invitations enable row level security;
