-- Fix the check_session_completion trigger to use session_quizzes junction table
-- The current trigger checks quizzes.session_id which is NULL

CREATE OR REPLACE FUNCTION public.check_session_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_session_id UUID;
    v_total_quizzes INT;
    v_completed_quizzes INT;
BEGIN
    -- Get session_id from session_quizzes junction table
    SELECT sq.session_id INTO v_session_id
    FROM session_quizzes sq 
    WHERE sq.quiz_id = NEW.quiz_id
    LIMIT 1;
    
    -- If quiz is not linked to a session, exit
    IF v_session_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count total quizzes for session via junction table
    SELECT COUNT(*) INTO v_total_quizzes
    FROM session_quizzes WHERE session_id = v_session_id;
    
    -- Count completed quizzes by user for this session via junction table
    SELECT COUNT(DISTINCT qs.quiz_id) INTO v_completed_quizzes
    FROM quiz_submissions qs
    JOIN session_quizzes sq ON sq.quiz_id = qs.quiz_id
    WHERE sq.session_id = v_session_id AND qs.user_id = NEW.user_id;
    
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
$function$;