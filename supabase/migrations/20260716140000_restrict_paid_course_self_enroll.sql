-- Paid courses: enrollment only via verify-razorpay-payment (service role) or admin
CREATE OR REPLACE FUNCTION public.is_paid_course(_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT (COALESCE(price_inr_paise, 0) > 0 OR COALESCE(price_usd_cents, 0) > 0)
      FROM courses
      WHERE id = _course_id
    ),
    false
  );
$$;

DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;

CREATE POLICY "Users can enroll themselves in free courses"
  ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      cohort_id IS NOT NULL
      OR (course_id IS NOT NULL AND NOT public.is_paid_course(course_id))
    )
  );

NOTIFY pgrst, 'reload schema';
