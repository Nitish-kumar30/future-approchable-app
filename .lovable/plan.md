

# Fix Slug Migration for Live Deployment

## Problem
The migration to add the `slug` column fails when publishing to Live because the backfill `DO` block doesn't execute properly before the `NOT NULL` constraint is applied. The Live database has 2 courses without slugs, and the migration errors with "column slug contains null values".

## Solution
Replace the current migration with one that handles the backfill inline with a DEFAULT, ensuring no null values exist before the NOT NULL constraint is set. The approach:

1. Drop the existing migration file
2. Create a new migration that:
   - Adds the `slug` column with a temporary default (empty string) so it's never null
   - Immediately backfills all rows with proper slugs generated from names
   - Sets the NOT NULL constraint (already satisfied)
   - Creates the unique index
   - Includes `NOTIFY pgrst, 'reload schema'` to refresh the API cache

## Technical Details

**File:** `supabase/migrations/20260220124527_333e6a9e-8065-46a0-ac2d-03d3e8b1d547.sql`

Replace the migration with:

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

Key differences from the original:
- Uses `NOT NULL DEFAULT ''` to add the column, so it's never null at any point
- Uses `IF NOT EXISTS` to handle partial application gracefully
- Calls the `generate_slug` function for consistency
- Drops the default after backfill so future inserts require explicit slugs
- Adds `NOTIFY pgrst, 'reload schema'` to refresh the API cache

No frontend code changes needed -- this is purely a migration fix.

