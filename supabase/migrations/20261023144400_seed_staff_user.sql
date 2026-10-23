-- SPEC-08: staff user for local testing (auth + profile)
-- Migration: seed_staff_user

do $$
declare
  v_daycare_id uuid;
  v_user_id uuid := '11111111-1111-4111-8111-111111111111';
  v_email text := 'anibal@gmail.com';
  v_full_name text := 'Anibal Delgado';
begin
  select id into strict v_daycare_id
  from public.daycares
  where name = 'Guardería Sala Soles';

  select coalesce(
    (select id from auth.users where email = v_email),
    v_user_id
  ) into v_user_id;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt('123456', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name),
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true
    ),
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;

  insert into public.users (
    id,
    daycare_id,
    role,
    status,
    full_name
  )
  values (
    v_user_id,
    v_daycare_id,
    'staff',
    'active',
    v_full_name
  )
  on conflict (id) do nothing;
end;
$$;
