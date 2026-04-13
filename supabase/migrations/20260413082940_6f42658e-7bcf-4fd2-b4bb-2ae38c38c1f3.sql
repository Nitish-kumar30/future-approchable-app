
-- Create a security-barrier view exposing only safe cohort fields
CREATE VIEW public.cohorts_public
WITH (security_barrier = true, security_invoker = on) AS
SELECT
  id, name, description, mentor_name, mentor_info,
  start_date, end_date, max_seats, session_time,
  is_published, enrollment_disabled, created_at, updated_at
FROM public.cohorts
WHERE is_published = true;

-- Grant access on the view
GRANT SELECT ON public.cohorts_public TO anon, authenticated;

-- Drop the old permissive policy that exposes all columns to everyone
DROP POLICY "Anyone can view published cohorts" ON public.cohorts;

-- New policy: only enrolled users or admins can SELECT from cohorts table directly
CREATE POLICY "Enrolled users and admins can view cohorts"
ON public.cohorts FOR SELECT TO public
USING (
  is_enrolled_in_cohort(auth.uid(), id) OR is_admin()
);
