## Publish blocker: fix Security Definer View

### What's blocking publish
The Supabase linter reports one `error`-level finding: **`SUPA_security_definer_view`**. Lovable refuses to publish while any critical finding is open.

The offending object is the view `public.cohorts_public`. In Postgres, views run with the view owner's permissions by default, which effectively bypasses the querying user's RLS on the underlying `cohorts` table. Newer Postgres versions expose a `security_invoker` option to flip this so the view runs as the caller and respects their RLS — that's the fix the linter wants.

The view itself is fine and still needed (it exposes only published cohorts). We just need to change its execution mode.

### Fix (single migration)

```sql
ALTER VIEW public.cohorts_public SET (security_invoker = true);
```

This is a one-line change. RLS on `cohorts` already restricts what `anon`/`authenticated` can read, and the view's `WHERE is_published = true` filter stays intact, so no functional change for consumers of `cohorts_public`.

### After the migration
1. Re-run the security scan (`security--run_security_scan`) — the `SUPA_security_definer_view` finding should clear.
2. Publish.

### Not addressed here (non-blocking, deliberately left alone)
- `console.error` in client code — info, not a blocker.
- Self-enroll lacks capacity check — warn; already partially mitigated by the paid-course RLS guard added on the payment branch.
- `course_ratings` publicly readable — warn; matches current product intent (ratings are shown to unauthenticated visitors on the course page).
- Public `course-images` bucket — warn; intentional for thumbnails.
- Leaked-password protection off — warn; auth policy decision.
- SECURITY DEFINER **functions** (`has_role`, `is_admin`, `submit_quiz_answers`, etc.) — warn; these are load-bearing helpers and correctly use `SECURITY DEFINER` with `SET search_path = public`.

Happy to address any of the warns in a follow-up if you want, but none of them block publish.
