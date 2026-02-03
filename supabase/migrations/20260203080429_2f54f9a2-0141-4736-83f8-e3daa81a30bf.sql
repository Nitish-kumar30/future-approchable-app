-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Enrolled users and admins can view sessions" ON public.sessions;

-- Create new policy that allows viewing sessions for published courses
-- Anyone can view sessions if the course/cohort is published
-- Enrolled users and admins can always view
CREATE POLICY "Sessions viewable for published courses or enrolled users"
ON public.sessions
FOR SELECT
USING (
  is_admin() 
  OR ((cohort_id IS NOT NULL) AND is_enrolled_in_cohort(auth.uid(), cohort_id))
  OR ((course_id IS NOT NULL) AND is_enrolled_in_course(auth.uid(), course_id))
  OR ((course_id IS NOT NULL) AND EXISTS (
    SELECT 1 FROM courses c WHERE c.id = sessions.course_id AND c.is_published = true
  ))
  OR ((cohort_id IS NOT NULL) AND EXISTS (
    SELECT 1 FROM cohorts c WHERE c.id = sessions.cohort_id AND c.is_published = true
  ))
);