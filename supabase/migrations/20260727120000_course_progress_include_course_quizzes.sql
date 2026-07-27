-- Align course certificate progress with CourseDetail UI: include course-level quizzes
-- (quizzes.course_id set, session_id null) in addition to session-linked quizzes.

CREATE OR REPLACE FUNCTION public.compute_enrollment_progress_percent(
  p_user_id UUID,
  p_cohort_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_sessions INT := 0;
  v_done_sessions INT := 0;
  v_total_chapters INT := 0;
  v_done_chapters INT := 0;
  v_session_quizzes INT := 0;
  v_course_quizzes INT := 0;
  v_done_session_quizzes INT := 0;
  v_done_course_quizzes INT := 0;
  v_total_items INT := 0;
  v_done_items INT := 0;
BEGIN
  IF p_cohort_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_sessions FROM public.sessions WHERE cohort_id = p_cohort_id;
    IF v_total_sessions = 0 THEN RETURN 0; END IF;
    SELECT COUNT(*) INTO v_done_sessions
    FROM public.session_progress sp
    JOIN public.sessions s ON s.id = sp.session_id
    WHERE s.cohort_id = p_cohort_id AND sp.user_id = p_user_id AND sp.is_completed = true;
    RETURN LEAST(100, GREATEST(0, ROUND((v_done_sessions::numeric / v_total_sessions::numeric) * 100)));
  ELSIF p_course_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_chapters
    FROM public.chapters c
    JOIN public.sessions s ON s.id = c.session_id
    WHERE s.course_id = p_course_id;

    SELECT COUNT(*) INTO v_done_chapters
    FROM public.chapter_progress cp
    JOIN public.chapters c ON c.id = cp.chapter_id
    JOIN public.sessions s ON s.id = c.session_id
    WHERE s.course_id = p_course_id AND cp.user_id = p_user_id AND cp.is_completed = true;

    SELECT COUNT(*) INTO v_session_quizzes
    FROM public.session_quizzes sq
    JOIN public.sessions s ON s.id = sq.session_id
    WHERE s.course_id = p_course_id;

    SELECT COUNT(*) INTO v_course_quizzes
    FROM public.quizzes q
    WHERE q.course_id = p_course_id AND q.session_id IS NULL;

    SELECT COUNT(DISTINCT qs.quiz_id) INTO v_done_session_quizzes
    FROM public.quiz_submissions qs
    JOIN public.session_quizzes sq ON sq.quiz_id = qs.quiz_id
    JOIN public.sessions s ON s.id = sq.session_id
    WHERE s.course_id = p_course_id AND qs.user_id = p_user_id;

    SELECT COUNT(DISTINCT qs.quiz_id) INTO v_done_course_quizzes
    FROM public.quiz_submissions qs
    JOIN public.quizzes q ON q.id = qs.quiz_id
    WHERE q.course_id = p_course_id AND q.session_id IS NULL AND qs.user_id = p_user_id;

    v_total_items := v_total_chapters + v_session_quizzes + v_course_quizzes;
    v_done_items := v_done_chapters + v_done_session_quizzes + v_done_course_quizzes;

    IF v_total_items = 0 THEN RETURN 0; END IF;
    RETURN LEAST(100, GREATEST(0, ROUND((v_done_items::numeric / v_total_items::numeric) * 100)));
  END IF;
  RETURN 0;
END;
$$;

NOTIFY pgrst, 'reload schema';
