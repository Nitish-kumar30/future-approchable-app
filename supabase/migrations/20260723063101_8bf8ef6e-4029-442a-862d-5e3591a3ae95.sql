CREATE POLICY "Authenticated users can view published cohorts"
ON public.cohorts
FOR SELECT
TO authenticated
USING (is_published = true);