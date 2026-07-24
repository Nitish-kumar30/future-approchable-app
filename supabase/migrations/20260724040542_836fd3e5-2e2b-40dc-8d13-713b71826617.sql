DO $$ BEGIN
  CREATE TYPE public.certificate_tier AS ENUM ('foundation', 'practitioner', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.certificate_request_status AS ENUM ('pending', 'approved', 'rejected', 'issued');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.certificate_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  tier public.certificate_tier NOT NULL,
  status public.certificate_request_status NOT NULL DEFAULT 'pending',
  linkedin_post_url TEXT,
  learner_note TEXT,
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT certificate_request_enrollment CHECK (
    (cohort_id IS NOT NULL AND course_id IS NULL) OR
    (cohort_id IS NULL AND course_id IS NOT NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_requests TO authenticated;
GRANT ALL ON public.certificate_requests TO service_role;

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  tier public.certificate_tier NOT NULL,
  request_id UUID REFERENCES public.certificate_requests(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  completion_date DATE NOT NULL,
  instructor_name TEXT NOT NULL DEFAULT 'Ranbeer Makin',
  instructor_title TEXT NOT NULL DEFAULT 'Instructor & Founder',
  pdf_storage_path TEXT NOT NULL,
  verify_url TEXT NOT NULL,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT certificate_enrollment CHECK (
    (cohort_id IS NOT NULL AND course_id IS NULL) OR
    (cohort_id IS NULL AND course_id IS NOT NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_tier_cohort_unique ON public.certificates (user_id, cohort_id, tier) WHERE cohort_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_tier_course_unique ON public.certificates (user_id, course_id, tier) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS certificate_requests_active_unique ON public.certificate_requests (user_id, cohort_id, course_id, tier) WHERE status IN ('pending', 'approved');
CREATE INDEX IF NOT EXISTS certificate_requests_status_idx ON public.certificate_requests (status);
CREATE INDEX IF NOT EXISTS certificate_requests_user_idx ON public.certificate_requests (user_id);
CREATE INDEX IF NOT EXISTS certificates_user_idx ON public.certificates (user_id);
CREATE INDEX IF NOT EXISTS certificates_certificate_id_idx ON public.certificates (certificate_id);

ALTER TABLE public.certificate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own certificate requests" ON public.certificate_requests;
CREATE POLICY "Users can view own certificate requests" ON public.certificate_requests FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Users can create own certificate requests" ON public.certificate_requests;
CREATE POLICY "Users can create own certificate requests" ON public.certificate_requests FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can update certificate requests" ON public.certificate_requests;
CREATE POLICY "Admins can update certificate requests" ON public.certificate_requests FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "Users can view own certificates" ON public.certificates;
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Admins can insert certificates" ON public.certificates;
CREATE POLICY "Admins can insert certificates" ON public.certificates FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins can update certificates" ON public.certificates;
CREATE POLICY "Admins can update certificates" ON public.certificates FOR UPDATE USING (public.is_admin());

DROP TRIGGER IF EXISTS update_certificate_requests_updated_at ON public.certificate_requests;
CREATE TRIGGER update_certificate_requests_updated_at BEFORE UPDATE ON public.certificate_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.compute_enrollment_progress_percent(
  p_user_id UUID, p_cohort_id UUID DEFAULT NULL, p_course_id UUID DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_sessions INT := 0; v_done_sessions INT := 0;
  v_total_chapters INT := 0; v_done_chapters INT := 0;
  v_total_quizzes INT := 0; v_done_quizzes INT := 0;
  v_total_items INT := 0; v_done_items INT := 0;
BEGIN
  IF p_cohort_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_sessions FROM public.sessions WHERE cohort_id = p_cohort_id;
    IF v_total_sessions = 0 THEN RETURN 0; END IF;
    SELECT COUNT(*) INTO v_done_sessions FROM public.session_progress sp JOIN public.sessions s ON s.id = sp.session_id WHERE s.cohort_id = p_cohort_id AND sp.user_id = p_user_id AND sp.is_completed = true;
    RETURN LEAST(100, GREATEST(0, ROUND((v_done_sessions::numeric / v_total_sessions::numeric) * 100)));
  ELSIF p_course_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_chapters FROM public.chapters c JOIN public.sessions s ON s.id = c.session_id WHERE s.course_id = p_course_id;
    SELECT COUNT(*) INTO v_done_chapters FROM public.chapter_progress cp JOIN public.chapters c ON c.id = cp.chapter_id JOIN public.sessions s ON s.id = c.session_id WHERE s.course_id = p_course_id AND cp.user_id = p_user_id AND cp.is_completed = true;
    SELECT COUNT(*) INTO v_total_quizzes FROM public.session_quizzes sq JOIN public.sessions s ON s.id = sq.session_id WHERE s.course_id = p_course_id;
    SELECT COUNT(DISTINCT qs.quiz_id) INTO v_done_quizzes FROM public.quiz_submissions qs JOIN public.session_quizzes sq ON sq.quiz_id = qs.quiz_id JOIN public.sessions s ON s.id = sq.session_id WHERE s.course_id = p_course_id AND qs.user_id = p_user_id;
    v_total_items := v_total_chapters + v_total_quizzes;
    v_done_items := v_done_chapters + v_done_quizzes;
    IF v_total_items = 0 THEN RETURN 0; END IF;
    RETURN LEAST(100, GREATEST(0, ROUND((v_done_items::numeric / v_total_items::numeric) * 100)));
  END IF;
  RETURN 0;
END; $$;

CREATE OR REPLACE FUNCTION public.get_certificate_eligibility(
  p_user_id UUID, p_cohort_id UUID DEFAULT NULL, p_course_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enrolled BOOLEAN := false; v_progress INT := 0; v_existing JSONB; v_pending JSONB;
BEGIN
  IF p_cohort_id IS NOT NULL THEN
    v_enrolled := public.is_enrolled_in_cohort(p_user_id, p_cohort_id);
  ELSIF p_course_id IS NOT NULL THEN
    v_enrolled := public.is_enrolled_in_course(p_user_id, p_course_id);
  ELSE
    RETURN jsonb_build_object('error', 'cohort_id or course_id required');
  END IF;
  IF NOT v_enrolled THEN
    RETURN jsonb_build_object('enrolled', false, 'progress_percent', 0, 'foundation_requestable', false, 'existing_certificates', '[]'::jsonb, 'pending_requests', '[]'::jsonb);
  END IF;
  v_progress := public.compute_enrollment_progress_percent(p_user_id, p_cohort_id, p_course_id);
  SELECT COALESCE(jsonb_agg(jsonb_build_object('tier', tier, 'certificate_id', certificate_id, 'issued_at', issued_at)), '[]'::jsonb)
  INTO v_existing FROM public.certificates
  WHERE user_id = p_user_id AND ((p_cohort_id IS NOT NULL AND cohort_id = p_cohort_id) OR (p_course_id IS NOT NULL AND course_id = p_course_id));
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'tier', tier, 'status', status, 'created_at', created_at)), '[]'::jsonb)
  INTO v_pending FROM public.certificate_requests
  WHERE user_id = p_user_id AND status IN ('pending', 'approved')
    AND ((p_cohort_id IS NOT NULL AND cohort_id = p_cohort_id) OR (p_course_id IS NOT NULL AND course_id = p_course_id));
  RETURN jsonb_build_object('enrolled', true, 'progress_percent', v_progress, 'foundation_requestable', v_progress = 100, 'existing_certificates', v_existing, 'pending_requests', v_pending);
END; $$;

GRANT EXECUTE ON FUNCTION public.compute_enrollment_progress_percent(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_certificate_eligibility(UUID, UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can upload certificate PDFs" ON storage.objects;
CREATE POLICY "Admins can upload certificate PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates' AND public.is_admin());
DROP POLICY IF EXISTS "Admins can update certificate PDFs" ON storage.objects;
CREATE POLICY "Admins can update certificate PDFs" ON storage.objects FOR UPDATE USING (bucket_id = 'certificates' AND public.is_admin());
DROP POLICY IF EXISTS "Admins can delete certificate PDFs" ON storage.objects;
CREATE POLICY "Admins can delete certificate PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'certificates' AND public.is_admin());
DROP POLICY IF EXISTS "Users can read own certificate PDFs" ON storage.objects;
CREATE POLICY "Users can read own certificate PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'certificates' AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text));