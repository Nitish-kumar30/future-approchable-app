-- Fix 1: Restrict profiles table to only allow users to view their own profile or admins
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all" 
ON public.profiles 
FOR SELECT 
USING ((user_id = auth.uid()) OR is_admin());

-- Fix 2: Restrict sessions table to enrolled users and admins only (remove public access)
DROP POLICY IF EXISTS "Anyone can view session basics" ON public.sessions;

CREATE POLICY "Enrolled users and admins can view sessions" 
ON public.sessions 
FOR SELECT 
USING (
  is_admin() 
  OR (cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), cohort_id))
  OR (course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), course_id))
);