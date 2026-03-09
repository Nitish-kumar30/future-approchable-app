
DROP POLICY IF EXISTS "Sessions viewable for published courses or enrolled users" ON sessions;

CREATE POLICY "Sessions viewable by enrolled users or admins"
ON sessions FOR SELECT USING (
  is_admin()
  OR (cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), cohort_id))
  OR (course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), course_id))
);
