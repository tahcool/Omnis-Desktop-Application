-- Links existing portal accounts that have auth users but missing auth_user_id
-- Run in: https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new

-- Step 1: Preview which accounts will be linked
SELECT
  a.id,
  a.email,
  a.customer_name,
  a.auth_user_id AS current_auth_user_id,
  u.id           AS found_auth_user_id
FROM public.ft_customer_portal_accounts a
LEFT JOIN auth.users u ON u.email = a.email
WHERE a.auth_user_id IS NULL
  AND u.id IS NOT NULL;

-- Step 2: Link them (run after previewing above)
UPDATE public.ft_customer_portal_accounts a
SET auth_user_id = u.id
FROM auth.users u
WHERE u.email = a.email
  AND a.auth_user_id IS NULL;

-- Step 3: Verify
SELECT id, email, customer_name, auth_user_id, is_active
FROM public.ft_customer_portal_accounts
ORDER BY created_at DESC;
