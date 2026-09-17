-- LabelM — Seed the first owner.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- It bypasses RLS (editor runs as service role). Change the email,
-- password and full_name below before running.
--
-- IMPORTANT: after this runs, delete or keep the script; do NOT re-run it
-- (it would fail on the unique email in auth.users).

do $$
declare
  new_user_id uuid;
  user_email text := 'saibalkole@gmail.com';
  user_password text := 'Test@1234';
  user_name text := 'Saibal Kole';
begin
  -- 1) Create the auth user (confirmed, email + password)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', user_name),
    now(),
    now()
  )
  returning id into new_user_id;

  -- 2) Create the employee row (role + status)
  insert into public.employees (id, email, full_name, role, status)
  values (new_user_id, user_email, user_name, 'owner', 'active');

  raise notice 'Created owner user % (%)', user_email, new_user_id;
end;
$$;