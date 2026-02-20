
-- Add slug column to courses
ALTER TABLE public.courses ADD COLUMN slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX idx_courses_slug ON public.courses (slug);

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

-- Backfill existing courses with slugs from their names
-- Add numeric suffix if duplicate
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN SELECT id, name FROM courses WHERE slug IS NULL ORDER BY created_at LOOP
    base_slug := lower(regexp_replace(regexp_replace(trim(r.name), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
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

-- Now make slug NOT NULL
ALTER TABLE public.courses ALTER COLUMN slug SET NOT NULL;
