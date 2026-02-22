
-- Add slug column with a default to avoid null issues
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '';

-- Function to generate a slug from text
CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(trim(input_text), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$;

-- Backfill existing courses with slugs
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN SELECT id, name FROM courses WHERE slug = '' ORDER BY created_at LOOP
    base_slug := public.generate_slug(r.name);
    final_slug := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM courses WHERE slug = final_slug AND id != r.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    UPDATE courses SET slug = final_slug WHERE id = r.id;
  END LOOP;
END;
$$;

-- Remove the default so future inserts must provide a slug
ALTER TABLE public.courses ALTER COLUMN slug DROP DEFAULT;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_slug ON public.courses (slug);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
