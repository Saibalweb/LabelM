-- LabelM — Seed the first owner.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- It bypasses RLS (editor runs as service role). Change the email,
-- password and full_name below before running.
--
-- Why this is careful: creating users by direct INSERT into auth.users is
-- error-prone. GoTrue fails with "Database error querying schema" when the
-- token columns are NULL, and email/password login needs a matching row in
-- auth.identities. This script handles both. Re-running is safe: it first
-- deletes any existing user with the same email (employees row is removed by
-- ON DELETE CASCADE).

do $$
declare
  new_user_id uuid;
  user_email text := 'saibalkole@gmail.com';
  user_password text := 'ChangeMe123!';
  user_name text := 'Saibal Kole';
begin
  -- 0) Clean up a previously seeded user for this email (idempotent re-run).
  delete from auth.users where email = user_email;

  -- 1) Create the auth user. Token columns MUST be empty strings, not NULL.
  --    (confirmed_at is a generated column — do not insert into it.)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current, email_change,
    phone_change_token, phone_change, reauthentication_token,
    is_sso_user, is_anonymous,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', user_email, crypt(user_password, gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    false, false,
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', user_name), now(), now()
  )
  returning id into new_user_id;

  -- 2) The identity row GoTrue expects for email/password auth.
  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(), new_user_id, user_email, 'email',
    jsonb_build_object('sub', new_user_id::text, 'email', user_email, 'email_verified', true),
    now(), now(), now()
  );

  -- 3) The application profile row.
  insert into public.employees (id, email, full_name, role, status)
  values (new_user_id, user_email, user_name, 'owner', 'active');

  raise notice 'Created owner user % (%)', user_email, new_user_id;
end;
$$;