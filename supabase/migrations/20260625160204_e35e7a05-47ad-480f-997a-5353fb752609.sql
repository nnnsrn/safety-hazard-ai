CREATE OR REPLACE FUNCTION public.seed_demo_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_manager_id uuid;
  v_inspector_id uuid;
  v_result jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can seed demo accounts';
  END IF;

  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@ehss-ai.com' LIMIT 1;
  IF v_admin_id IS NOT NULL THEN
    UPDATE public.profiles SET status='active', reviewed_at=COALESCE(reviewed_at, now()) WHERE id=v_admin_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin') ON CONFLICT DO NOTHING;
    v_result := v_result || jsonb_build_object('admin', 'activated');
  END IF;

  SELECT id INTO v_manager_id FROM auth.users WHERE email = 'manager@ehss-ai.com' LIMIT 1;
  IF v_manager_id IS NOT NULL THEN
    UPDATE public.profiles SET status='active', reviewed_at=COALESCE(reviewed_at, now()) WHERE id=v_manager_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_manager_id, 'manager') ON CONFLICT DO NOTHING;
    v_result := v_result || jsonb_build_object('manager', 'activated');
  END IF;

  SELECT id INTO v_inspector_id FROM auth.users WHERE email = 'inspector@ehss-ai.com' LIMIT 1;
  IF v_inspector_id IS NOT NULL THEN
    UPDATE public.profiles SET status='active', reviewed_at=COALESCE(reviewed_at, now()) WHERE id=v_inspector_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_inspector_id, 'inspector') ON CONFLICT DO NOTHING;
    v_result := v_result || jsonb_build_object('inspector', 'activated');
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.seed_demo_accounts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_accounts() TO authenticated;
