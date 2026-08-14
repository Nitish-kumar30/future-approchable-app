# Deploy `check-registration-status`

Deploy the existing edge function `check-registration-status` to this branch's backend environment.

## What happens
- Deploy `supabase/functions/check-registration-status/index.ts` as-is (no code changes).
- Config stays the same: `verify_jwt = false` in `supabase/config.toml` (the function validates the bearer token itself).
- After deploy, confirm the function responds (401 without a token, JSON `{approved: boolean}` with one).

## Notes
- No database migrations, no new secrets, no frontend changes.
