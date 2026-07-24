CREATE OR REPLACE FUNCTION public.upsert_chapter_progress(
  _chapter_id UUID,
  _user_id UUID,
  _watched_seconds INTEGER,
  _is_completed BOOLEAN
)
RETURNS public.chapter_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.chapter_progress;
BEGIN
  INSERT INTO public.chapter_progress (user_id, chapter_id, watched_seconds, is_completed, completed_at)
  VALUES (_user_id, _chapter_id, GREATEST(0, _watched_seconds), _is_completed, CASE WHEN _is_completed THEN now() END)
  ON CONFLICT (user_id, chapter_id) DO UPDATE SET
    watched_seconds = GREATEST(chapter_progress.watched_seconds, EXCLUDED.watched_seconds),
    is_completed = chapter_progress.is_completed OR EXCLUDED.is_completed,
    completed_at = COALESCE(chapter_progress.completed_at, EXCLUDED.completed_at),
    updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_chapter_progress(UUID, UUID, INTEGER, BOOLEAN) TO service_role;