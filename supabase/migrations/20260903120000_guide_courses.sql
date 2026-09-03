-- Text-based guide courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_text_course BOOLEAN NOT NULL DEFAULT false;

-- ============ guide_chapters ============
CREATE TABLE public.guide_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  chapter_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guide_chapters_course ON public.guide_chapters(course_id, chapter_order);

GRANT SELECT ON public.guide_chapters TO authenticated;
GRANT ALL ON public.guide_chapters TO service_role;

ALTER TABLE public.guide_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage guide chapters"
  ON public.guide_chapters FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users read published guide chapters"
  ON public.guide_chapters FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = guide_chapters.course_id
        AND c.is_text_course = true
        AND c.is_published = true
    )
  );

CREATE TRIGGER update_guide_chapters_updated_at
  BEFORE UPDATE ON public.guide_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ guide_chapter_progress ============
CREATE TABLE public.guide_chapter_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_chapter_id UUID NOT NULL REFERENCES public.guide_chapters(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, guide_chapter_id)
);

CREATE INDEX idx_guide_chapter_progress_user ON public.guide_chapter_progress(user_id);
CREATE INDEX idx_guide_chapter_progress_chapter ON public.guide_chapter_progress(guide_chapter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_chapter_progress TO authenticated;
GRANT ALL ON public.guide_chapter_progress TO service_role;

ALTER TABLE public.guide_chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own guide chapter progress"
  ON public.guide_chapter_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all guide chapter progress"
  ON public.guide_chapter_progress FOR SELECT
  USING (public.is_admin());

CREATE TRIGGER update_guide_chapter_progress_updated_at
  BEFORE UPDATE ON public.guide_chapter_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
