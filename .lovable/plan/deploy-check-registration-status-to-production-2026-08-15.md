# Deploy `check-registration-status` to production

Deploy the existing edge function to the live (production) backend — no code changes.

## Steps
1. Deploy `supabase/functions/check-registration-status/index.ts` to the production environment.
2. Verify it responds: 401 without a bearer token, JSON `{ approved: boolean }` with one.

## Notes
- No migrations, no new secrets, no frontend changes.
- Config unchanged: `verify_jwt = false` (the function validates the token itself).
- The deployed code includes the whitespace/case-insensitive cohort-name matching fix.
