-- Optional post-migration seed / demo helpers
-- Auth users must exist first (Supabase Auth). Replace UUIDs and emails with real values.

-- Example: promote a user to Admin after first signup
-- UPDATE public.profiles
-- SET role_id = (SELECT id FROM public.roles WHERE slug = 'admin' LIMIT 1)
-- WHERE email = 'admin@yourcompany.com';

-- Example: attach profile to a department (use real department UUID from public.departments)
-- UPDATE public.profiles
-- SET department_id = '00000000-0000-0000-0000-000000000000'
-- WHERE email = 'manager@yourcompany.com';

-- Sample operational rows require valid profiles.id as FKs for owner_id, created_by, etc.
-- INSERT INTO public.meetings (...) VALUES (...);
