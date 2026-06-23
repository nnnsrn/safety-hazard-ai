
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_account(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_account(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_account(UUID, TEXT) TO authenticated;
