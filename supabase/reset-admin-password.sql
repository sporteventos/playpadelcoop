-- Repor a password do admin e garantir o email confirmado.
-- Correr no SQL Editor do Supabase (service role). Ajusta o email/password se necessário.

-- 1) Ver se o utilizador existe e o estado de confirmação
select id, email, email_confirmed_at, created_at
from auth.users
where email = 'esguamusse@gmail.com';

-- 2) Repor password + confirmar email
update auth.users
set
  encrypted_password = crypt('euPassw0rd!', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at         = now()
where email = 'esguamusse@gmail.com';

-- 3) Confirmar que ficou atualizado
select id, email, email_confirmed_at, updated_at
from auth.users
where email = 'esguamusse@gmail.com';
