-- Create session_progress table to track user progress per session
CREATE TABLE public.session_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, session_id)
);

-- Enable RLS
ALTER TABLE public.session_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own progress"
ON public.session_progress FOR SELECT
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert own progress"
ON public.session_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
ON public.session_progress FOR UPDATE
USING (user_id = auth.uid());

-- Function to check and update session completion
CREATE OR REPLACE FUNCTION public.check_session_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID;
    v_total_quizzes INT;
    v_completed_quizzes INT;
BEGIN
    -- Get session_id from the quiz
    SELECT session_id INTO v_session_id
    FROM quizzes WHERE id = NEW.quiz_id;
    
    -- If quiz is not linked to a session, exit
    IF v_session_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count total quizzes for session
    SELECT COUNT(*) INTO v_total_quizzes
    FROM quizzes WHERE session_id = v_session_id;
    
    -- Count completed quizzes by user for this session
    SELECT COUNT(DISTINCT qs.quiz_id) INTO v_completed_quizzes
    FROM quiz_submissions qs
    JOIN quizzes q ON q.id = qs.quiz_id
    WHERE q.session_id = v_session_id AND qs.user_id = NEW.user_id;
    
    -- Insert or update session_progress
    INSERT INTO session_progress (user_id, session_id, is_completed, completed_at)
    VALUES (
        NEW.user_id,
        v_session_id,
        v_completed_quizzes >= v_total_quizzes,
        CASE WHEN v_completed_quizzes >= v_total_quizzes THEN now() ELSE NULL END
    )
    ON CONFLICT (user_id, session_id)
    DO UPDATE SET
        is_completed = v_completed_quizzes >= v_total_quizzes,
        completed_at = CASE WHEN v_completed_quizzes >= v_total_quizzes THEN now() ELSE session_progress.completed_at END,
        updated_at = now();
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-check completion after quiz submission
CREATE TRIGGER check_session_completion_trigger
AFTER INSERT ON public.quiz_submissions
FOR EACH ROW
EXECUTE FUNCTION public.check_session_completion();

-- Update sessions RLS to allow public viewing (title/description only)
DROP POLICY IF EXISTS "Enrolled users and admins can view sessions" ON public.sessions;

CREATE POLICY "Anyone can view session basics"
ON public.sessions FOR SELECT
USING (true);

-- Update timestamp trigger
CREATE TRIGGER update_session_progress_updated_at
BEFORE UPDATE ON public.session_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();