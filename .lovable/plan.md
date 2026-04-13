

## Fix: Cohort Registration Status Check Prefix Matching

### Problem
The `check-registration-status` edge function extracts a prefix from the cohort name by splitting on ` - `, resulting in `Cohort 5: AI Fundamentals`. It then tries to match this against `cohort_registrations.cohort` using `ilike`.

However, the actual registration record for `ranbeer@gmail.com` has `cohort = 'Cohort 5: AI Funda...'` (truncated/different format), so the pattern `Cohort 5: AI Fundamentals%` doesn't match, and the function returns `approved: false`, triggering the payment modal.

### Solution
Change the prefix extraction to use a regex that captures only `Cohort N` (e.g., `Cohort 5`), making the match resilient to different cohort name formats between the registration form and the database.

### Changes

**`supabase/functions/check-registration-status/index.ts`** (line ~85):
Replace:
```typescript
const cohortPrefix = cohort.name.split(" - ")[0].trim();
```
With:
```typescript
const match = cohort.name.match(/^(Cohort\s+\d+)/i);
const cohortPrefix = match ? match[1] : cohort.name.split(" - ")[0].trim();
```

This extracts just `Cohort 5` from any format like `Cohort 5: AI Fundamentals - Apr 23, 2026` or `Cohort 5 - April 23rd`, ensuring a reliable partial match against registration records.

