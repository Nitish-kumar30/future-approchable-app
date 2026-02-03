-- Create mini_projects table for session mini projects
CREATE TABLE public.mini_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mini_projects ENABLE ROW LEVEL SECURITY;

-- Admins can manage mini projects
CREATE POLICY "Admins can create mini projects"
ON public.mini_projects FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update mini projects"
ON public.mini_projects FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete mini projects"
ON public.mini_projects FOR DELETE
USING (is_admin());

-- Enrolled users and admins can view mini projects
CREATE POLICY "Enrolled users and admins can view mini projects"
ON public.mini_projects FOR SELECT
USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = mini_projects.session_id
    AND (
      (s.cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), s.cohort_id))
      OR (s.course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), s.course_id))
    )
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_mini_projects_updated_at
BEFORE UPDATE ON public.mini_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();