-- Create a function to get enrollment count for a cohort (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_cohort_enrollment_count(_cohort_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.enrollments
  WHERE cohort_id = _cohort_id
$$;