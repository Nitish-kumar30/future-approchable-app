
-- Replace check_session_completion with enrollment-scoped version
CREATE OR REPLACE FUNCTION public.check_session_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session RECORD;
    v_total_quizzes INT;
    v_completed_quizzes INT;
BEGIN
    -- Loop through all sessions linked to this quiz via session_quizzes,
    -- but only for sessions in cohorts/courses the user is enrolled in
    FOR v_session IN
        SELECT sq.session_id, s.cohort_id, s.course_id
        FROM session_quizzes sq
        JOIN sessions s ON s.id = sq.session_id
        WHERE sq.quiz_id = NEW.quiz_id
          AND (
            (s.cohort_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM enrollments e
              WHERE e.user_id = NEW.user_id AND e.cohort_id = s.cohort_id
            ))
            OR
            (s.course_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM enrollments e
              WHERE e.user_id = NEW.user_id AND e.course_id = s.course_id
            ))
          )
    LOOP
        -- Count total quizzes for this session
        SELECT COUNT(*) INTO v_total_quizzes
        FROM session_quizzes WHERE session_id = v_session.session_id;

        -- Count completed quizzes by user for this session
        SELECT COUNT(DISTINCT qs.quiz_id) INTO v_completed_quizzes
        FROM quiz_submissions qs
        JOIN session_quizzes sq ON sq.quiz_id = qs.quiz_id
        WHERE sq.session_id = v_session.session_id AND qs.user_id = NEW.user_id;

        -- Insert or update session_progress
        INSERT INTO session_progress (user_id, session_id, is_completed, completed_at)
        VALUES (
            NEW.user_id,
            v_session.session_id,
            v_completed_quizzes >= v_total_quizzes,
            CASE WHEN v_completed_quizzes >= v_total_quizzes THEN now() ELSE NULL END
        )
        ON CONFLICT (user_id, session_id)
        DO UPDATE SET
            is_completed = v_completed_quizzes >= v_total_quizzes,
            completed_at = CASE WHEN v_completed_quizzes >= v_total_quizzes THEN now() ELSE session_progress.completed_at END,
            updated_at = now();
    END LOOP;

    RETURN NEW;
END;
$function$;

-- Drop duplicate trigger (keep only check_session_completion_trigger)
DROP TRIGGER IF EXISTS on_quiz_submission_check_completion ON quiz_submissions;

-- Ensure the correct trigger exists
DROP TRIGGER IF EXISTS check_session_completion_trigger ON quiz_submissions;
CREATE TRIGGER check_session_completion_trigger
  AFTER INSERT ON quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_session_completion();
