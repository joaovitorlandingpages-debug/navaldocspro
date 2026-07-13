UPDATE auth.users
SET encrypted_password = crypt('Q7!@!*ADp%H%EJXwnu9m', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id = '51aeaaf5-8a10-40a7-8630-e761d7c484b2';