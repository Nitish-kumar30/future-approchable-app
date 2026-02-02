-- Create junction table for many-to-many relationship between sessions and quizzes
CREATE TABLE public.session_quizzes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, quiz_id)
);

-- Enable RLS
ALTER TABLE public.session_quizzes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage session_quizzes"
ON public.session_quizzes
FOR ALL
USING (is_admin());

CREATE POLICY "Enrolled users can view session_quizzes"
ON public.session_quizzes
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = session_quizzes.session_id
        AND (
            (s.cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), s.cohort_id))
            OR (s.course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), s.course_id))
        )
    )
);

-- Migrate existing quiz-session relationships to the junction table
INSERT INTO public.session_quizzes (session_id, quiz_id, display_order)
SELECT session_id, id, 0
FROM public.quizzes
WHERE session_id IS NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_session_quizzes_session_id ON public.session_quizzes(session_id);
CREATE INDEX idx_session_quizzes_quiz_id ON public.session_quizzes(quiz_id);