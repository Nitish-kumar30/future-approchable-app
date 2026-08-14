# Redeploy `check-registration-status`

Redeploy the existing edge function with no code changes.

## Steps
1. Deploy `supabase/functions/check-registration-status/index.ts` as-is.
2. Confirm it responds: 401 without a bearer token, JSON `{ approved: boolean }` with one.

## Notes
- No migrations, no secrets, no frontend changes.
- Config unchanged: `verify_jwt = false` (the function validates the token in code).
