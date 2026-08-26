# Deploy `get-corporate-inquiries`

## What the last commit contains

Commit `8610d40` ("added inquiry form in admin tab", merged via PR #18) adds:
- New edge function: `supabase/functions/get-corporate-inquiries/index.ts` (reads corporate inquiry submissions from a Vercel Blob store, admin-only)
- Config entry in `supabase/config.toml`: `verify_jwt = false` (the function validates the bearer token in code)
- Frontend: `CorporateInquiriesAdminTab.tsx`, `src/lib/corporate-inquiries.ts`, Admin page wiring

**No database migrations** — nothing to run on the DB.

## Plan

1. Deploy the `get-corporate-inquiries` edge function to this branch's backend (Test).
2. Check whether the `BLOB_READ_WRITE_TOKEN` secret exists (the function needs the Vercel Blob token, same one used by the approachable-landing site). If missing, flag it — the function will fail without it, and the token must be supplied by you.
3. Smoke-test the function: expect 401 without a token; with an admin token it returns inquiries JSON (or a clear error if the blob token is missing).

## Notes

- No migrations, no new tables, no RLS changes.
- Frontend changes go live only via Publish; this plan covers the backend deploy only.
- If you also want it on Live, that requires a separate deploy after testing.
