ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS text_content TEXT;
