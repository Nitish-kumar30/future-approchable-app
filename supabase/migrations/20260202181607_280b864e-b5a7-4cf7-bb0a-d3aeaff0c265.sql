-- Fix the RLS policy for quizzes to check enrollment via session_quizzes junction table
-- The current policy checks quizzes.session_id which is NULL (quizzes are linked via session_quizzes)

-- Drop the existing policy
DROP POLICY IF EXISTS "Enrolled users and admins can view quizzes" ON public.quizzes;

-- Create new policy that checks enrollment via session_quizzes junction table
CREATE POLICY "Enrolled users and admins can view quizzes" 
ON public.quizzes 
FOR SELECT 
USING (
  is_admin() 
  OR (
    -- Check if quiz is linked to a session that belongs to a cohort/course the user is enrolled in
    EXISTS (
      SELECT 1 
      FROM session_quizzes sq
      JOIN sessions s ON sq.session_id = s.id
      WHERE sq.quiz_id = quizzes.id
      AND (
        (s.cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), s.cohort_id))
        OR (s.course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), s.course_id))
      )
    )
  )
  OR (
    -- Direct course_id on quiz (fallback for quizzes directly linked to courses)
    course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), course_id)
  )
);