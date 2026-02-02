-- Add image_url to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS image_url text;

-- Create pre_reading_materials table
CREATE TABLE IF NOT EXISTS public.pre_reading_materials (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title text NOT NULL,
    link text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on pre_reading_materials
ALTER TABLE public.pre_reading_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pre_reading_materials
-- Admins can manage pre-reading materials
CREATE POLICY "Admins can create pre-reading materials"
ON public.pre_reading_materials
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update pre-reading materials"
ON public.pre_reading_materials
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete pre-reading materials"
ON public.pre_reading_materials
FOR DELETE
USING (is_admin());

-- Enrolled users can view pre-reading materials for their sessions
CREATE POLICY "Enrolled users and admins can view pre-reading materials"
ON public.pre_reading_materials
FOR SELECT
USING (
    is_admin() OR
    EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = pre_reading_materials.session_id
        AND (
            (s.cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), s.cohort_id))
            OR
            (s.course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), s.course_id))
        )
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_pre_reading_materials_updated_at
BEFORE UPDATE ON public.pre_reading_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add course_id to quizzes for direct course association (quizzes can be linked to course OR session)
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

-- Update the quizzes table constraint - session_id should be nullable now
ALTER TABLE public.quizzes ALTER COLUMN session_id DROP NOT NULL;

-- Update the RLS policy for quizzes to include course-level quizzes
DROP POLICY IF EXISTS "Enrolled users and admins can view quizzes" ON public.quizzes;

CREATE POLICY "Enrolled users and admins can view quizzes"
ON public.quizzes
FOR SELECT
USING (
    is_admin() OR
    (session_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = quizzes.session_id
        AND (
            (s.cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), s.cohort_id))
            OR
            (s.course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), s.course_id))
        )
    ))
    OR
    (course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), course_id))
);