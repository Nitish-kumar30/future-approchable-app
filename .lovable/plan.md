

## Fix: Allow Public Access to Cohorts Listing View

### Problem
The `cohorts_public` view was created with `security_invoker = on`, so it runs queries with the caller's permissions. Since the base `cohorts` table RLS now requires enrollment or admin, non-enrolled users see nothing.

### Solution
Recreate the view with `security_invoker = off` (the default). This makes the view execute as its owner, bypassing RLS on the base table. This is safe because the view only exposes non-sensitive columns.

### Changes

**Database migration:**
```sql
DROP VIEW IF EXISTS public.cohorts_public;

CREATE VIEW public.cohorts_public
WITH (security_barrier = true) AS
SELECT id, name, description, mentor_name, mentor_info,
       start_date, end_date, max_seats, session_time,
       is_published, enrollment_disabled, created_at, updated_at
FROM public.cohorts
WHERE is_published = true;

GRANT SELECT ON public.cohorts_public TO anon, authenticated;
```

No frontend changes needed — `Cohorts.tsx` already queries `cohorts_public`.

