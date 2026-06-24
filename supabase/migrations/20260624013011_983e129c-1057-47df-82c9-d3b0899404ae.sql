-- Inspections table for persisting all detections
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  inspector_email TEXT NOT NULL,
  area TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload', -- upload | camera | live
  category INT NOT NULL, -- 1..5
  status TEXT NOT NULL, -- SAFE|WARNING|MODERATE|HIGH RISK|CRITICAL
  risk_score INT NOT NULL,
  severity TEXT NOT NULL,
  detected_objects JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_ppe JSONB NOT NULL DEFAULT '[]'::jsonb,
  env_hazards JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrective_action TEXT,
  image_data_url TEXT, -- thumbnail (base64) optional
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Inspectors see own; managers and admins see all
CREATE POLICY "View inspections by role" ON public.inspections
FOR SELECT TO authenticated
USING (
  inspector_id = auth.uid()
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Inspectors insert own inspection" ON public.inspections
FOR INSERT TO authenticated
WITH CHECK (inspector_id = auth.uid());

CREATE POLICY "Admins delete inspections" ON public.inspections
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
ALTER TABLE public.inspections REPLICA IDENTITY FULL;

CREATE INDEX idx_inspections_created_at ON public.inspections (created_at DESC);
CREATE INDEX idx_inspections_inspector ON public.inspections (inspector_id);
CREATE INDEX idx_inspections_category ON public.inspections (category);

-- Seed demo accounts function (admin-only or first-run callable)
CREATE OR REPLACE FUNCTION public.seed_demo_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_manager_id uuid;
  v_inspector_id uuid;
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- Admin
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
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_accounts() TO authenticated, anon;