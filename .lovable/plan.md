# Deploy updated/added edge functions

## What changed

Since merge commit `118d227` (PR #18), the following edge functions were added or modified:

- `supabase/functions/delete-submission/index.ts` — NEW. Allows admins to delete contact/corporate inquiry blobs from Vercel Blob storage.
- `supabase/functions/get-corporate-inquiries/index.ts` — UPDATED. Now returns both contact and corporate inquiries, with improved parsing and admin auth.
- `supabase/config.toml` — NEW entries for both functions with `verify_jwt = false`.

No database migrations or RLS changes are involved.

## Plan

1. Deploy `delete-submission` to the Test backend.
2. Deploy `get-corporate-inquiries` to the Test backend.
3. Smoke-test both functions:
   - `get-corporate-inquiries`: expect 401 without auth; with admin session, return inquiries JSON.
   - `delete-submission`: expect 401 without auth; with admin session, accept a valid UUID and form type.
4. Verify `BLOB_READ_WRITE_TOKEN` and `BLOB_STORE_ID` secrets are present (both functions need them).
5. Report results and ask whether to deploy to Live.

## Notes

- Frontend changes go live only via Publish; this plan covers backend deploy to Test.
- Live deployment requires a separate explicit step after Test verification.
