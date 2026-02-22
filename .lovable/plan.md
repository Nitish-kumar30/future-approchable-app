

# Fix: Replace the Broken Slug Migration

## Problem
There are currently **two** migration files for the slug column:
1. `20260220124527_...sql` -- The **original broken** migration (adds nullable column, backfills, then sets NOT NULL -- which fails on Live)
2. `20260222134826_...sql` -- The **fix** migration (meant to replace the first, but was added alongside it)

When publishing, migration `20260220124527` runs **first** and fails before the fix migration ever executes. The Live database confirmed: the `slug` column doesn't exist at all there.

## Solution
1. **Replace the original migration file** (`20260220124527_...sql`) with the fixed SQL that uses `NOT NULL DEFAULT ''` to safely add and backfill the column
2. **Delete the second migration file** (`20260222134826_...sql`) since it's now redundant

## Technical Details

**File to update:** `supabase/migrations/20260220124527_333e6a9e-8065-46a0-ac2d-03d3e8b1d547.sql`

Replace its contents with:

```sql
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
```

**File to delete:** `supabase/migrations/20260222134826_c4899374-9c5f-4ba1-a99d-46f909770889.sql`

This is a duplicate and no longer needed once the original is fixed.

After these changes, publish again and the migration should apply cleanly to Live.

