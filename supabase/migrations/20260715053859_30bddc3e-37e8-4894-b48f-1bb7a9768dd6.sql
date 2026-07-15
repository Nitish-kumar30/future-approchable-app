
-- ============ chapters ============
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  hls_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  chapter_order INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  is_content_unlocked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chapters_session ON public.chapters(session_id, chapter_order);

GRANT SELECT ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chapters"
  ON public.chapters FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Enrolled or preview can view chapters"
  ON public.chapters FOR SELECT
  USING (
    public.is_admin()
    OR is_preview = true
    OR EXISTS (
      SELECT 1
      FROM public.sessions s
      LEFT JOIN public.enrollments e ON (
        (s.course_id IS NOT NULL AND e.course_id = s.course_id AND e.user_id = auth.uid())
        OR (s.cohort_id IS NOT NULL AND e.cohort_id = s.cohort_id AND e.user_id = auth.uid())
      )
      WHERE s.id = chapters.session_id AND e.id IS NOT NULL
    )
  );

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ chapter_progress ============
CREATE TABLE public.chapter_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);
CREATE INDEX idx_chapter_progress_user ON public.chapter_progress(user_id);
CREATE INDEX idx_chapter_progress_chapter ON public.chapter_progress(chapter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_progress TO authenticated;
GRANT ALL ON public.chapter_progress TO service_role;

ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chapter progress"
  ON public.chapter_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all chapter progress"
  ON public.chapter_progress FOR SELECT
  USING (public.is_admin());

CREATE TRIGGER update_chapter_progress_updated_at
  BEFORE UPDATE ON public.chapter_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ course_ratings ============
CREATE TABLE public.course_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5 AND (rating * 2) = floor(rating * 2)),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_course_ratings_course ON public.course_ratings(course_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_ratings TO authenticated;
GRANT SELECT ON public.course_ratings TO anon;
GRANT ALL ON public.course_ratings TO service_role;

ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course ratings"
  ON public.course_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users manage own rating"
  ON public.course_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_course_ratings_updated_at
  BEFORE UPDATE ON public.course_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Community progress aggregate ============
CREATE OR REPLACE FUNCTION public.get_course_community_progress(_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrolled INT;
  v_sessions JSONB;
  v_distribution JSONB;
  v_avg NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_enrolled
  FROM public.enrollments WHERE course_id = _course_id;

  -- Per-session completion %
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_sessions
  FROM (
    SELECT s.id AS session_id,
           s.title,
           s.session_order,
           CASE WHEN v_enrolled = 0 THEN 0
                ELSE ROUND(100.0 * COUNT(DISTINCT sp.user_id) / v_enrolled)
           END AS completion_pct
    FROM public.sessions s
    LEFT JOIN public.session_progress sp
      ON sp.session_id = s.id AND sp.is_completed = true
    WHERE s.course_id = _course_id
    GROUP BY s.id, s.title, s.session_order
    ORDER BY s.session_order
  ) t;

  -- Distribution + average based on chapter completion ratio per user
  WITH totals AS (
    SELECT COUNT(*)::NUMERIC AS total_chapters
    FROM public.chapters c
    JOIN public.sessions s ON s.id = c.session_id
    WHERE s.course_id = _course_id
  ),
  per_user AS (
    SELECT e.user_id,
           CASE WHEN (SELECT total_chapters FROM totals) = 0 THEN 0
                ELSE 100.0 * COUNT(cp.id) FILTER (WHERE cp.is_completed) /
                     GREATEST((SELECT total_chapters FROM totals), 1)
           END AS pct
    FROM public.enrollments e
    LEFT JOIN public.chapters c
      ON c.session_id IN (SELECT id FROM public.sessions WHERE course_id = _course_id)
    LEFT JOIN public.chapter_progress cp
      ON cp.chapter_id = c.id AND cp.user_id = e.user_id
    WHERE e.course_id = _course_id
    GROUP BY e.user_id
  )
  SELECT
    jsonb_build_object(
      'bucket_0_25',   COUNT(*) FILTER (WHERE pct <  25),
      'bucket_25_50',  COUNT(*) FILTER (WHERE pct >= 25 AND pct < 50),
      'bucket_50_75',  COUNT(*) FILTER (WHERE pct >= 50 AND pct < 75),
      'bucket_75_100', COUNT(*) FILTER (WHERE pct >= 75)
    ),
    ROUND(AVG(pct), 1)
  INTO v_distribution, v_avg
  FROM per_user;

  RETURN jsonb_build_object(
    'enrolled_count', v_enrolled,
    'sessions', v_sessions,
    'distribution', COALESCE(v_distribution, '{}'::jsonb),
    'average_completion_pct', COALESCE(v_avg, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_community_progress(UUID) TO authenticated, anon;

-- ============ Extend session completion to include chapters ============
CREATE OR REPLACE FUNCTION public.recompute_session_completion(_user_id UUID, _session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_chapters INT;
  v_done_chapters INT;
  v_total_quizzes INT;
  v_done_quizzes INT;
  v_complete BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_total_chapters FROM public.chapters WHERE session_id = _session_id;
  SELECT COUNT(*) INTO v_done_chapters
    FROM public.chapter_progress cp
    JOIN public.chapters c ON c.id = cp.chapter_id
    WHERE c.session_id = _session_id AND cp.user_id = _user_id AND cp.is_completed = true;

  SELECT COUNT(*) INTO v_total_quizzes FROM public.session_quizzes WHERE session_id = _session_id;
  SELECT COUNT(DISTINCT qs.quiz_id) INTO v_done_quizzes
    FROM public.quiz_submissions qs
    JOIN public.session_quizzes sq ON sq.quiz_id = qs.quiz_id
    WHERE sq.session_id = _session_id AND qs.user_id = _user_id;

  -- If session has neither chapters nor quizzes, do nothing (manual completion path).
  IF v_total_chapters = 0 AND v_total_quizzes = 0 THEN
    RETURN;
  END IF;

  v_complete := (v_done_chapters >= v_total_chapters) AND (v_done_quizzes >= v_total_quizzes);

  INSERT INTO public.session_progress (user_id, session_id, is_completed, completed_at)
  VALUES (_user_id, _session_id, v_complete, CASE WHEN v_complete THEN now() ELSE NULL END)
  ON CONFLICT (user_id, session_id) DO UPDATE
  SET is_completed = v_complete,
      completed_at = CASE WHEN v_complete THEN COALESCE(public.session_progress.completed_at, now()) ELSE NULL END,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.on_chapter_progress_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  SELECT session_id INTO v_session_id FROM public.chapters WHERE id = NEW.chapter_id;
  IF v_session_id IS NOT NULL THEN
    PERFORM public.recompute_session_completion(NEW.user_id, v_session_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chapter_progress_after
  AFTER INSERT OR UPDATE ON public.chapter_progress
  FOR EACH ROW EXECUTE FUNCTION public.on_chapter_progress_change();
