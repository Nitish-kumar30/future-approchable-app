# Fix: Cohorts not visible in production

## Root cause (verified in Live)

`/cohorts` reads from the `public.cohorts_public` view. In Live:

- The view exists.
- It has **zero GRANTs** — neither `anon` nor `authenticated` can read it.
- Underlying `cohorts` table's only SELECT policy is "Enrolled users and admins", so the base table also returns nothing.

Result: signed-in users see an empty list, even though Cohort 6 (Jul 23, 2026) is `is_published=true`, `enrollment_disabled=false`.

Test DB already has the grant, which is why it works there. This is a Test→Live sync gap.

## Fix

One-line migration, auth-only per your choice:

```sql
GRANT SELECT ON public.cohorts_public TO authenticated;
```

No `anon` grant — logged-out visitors won't see cohorts; they must sign in first.

## Verification

After publish applies the migration to Live:
1. Sign in on `https://learn.approachable.dev`, open `/cohorts` — Cohort 6 shows under active, older ones under Past Cohorts.
2. Incognito (logged out) `/cohorts` — remains empty (expected).

No frontend changes.
