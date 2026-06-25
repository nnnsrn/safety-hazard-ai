
-- Revoke broad EXECUTE on all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_account(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_account(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_demo_accounts() FROM PUBLIC, anon, authenticated;

-- has_role is invoked inside RLS policies; callers need EXECUTE.
-- Internal logic only reads user_roles; no privilege escalation.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Admin-only RPCs: function body enforces has_role(auth.uid(), 'admin')
GRANT EXECUTE ON FUNCTION public.approve_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_account(uuid, text) TO authenticated;

-- Demo bootstrap RPC: authenticated only (function activates fixed demo emails)
GRANT EXECUTE ON FUNCTION public.seed_demo_accounts() TO authenticated;

-- handle_new_user runs only as an auth.users trigger; no role needs EXECUTE.
-- (Triggers execute as table owner, independent of caller grants.)
