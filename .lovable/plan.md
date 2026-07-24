# Review of last 2 commits

## `c460cd4` — fix pdf render issue
Bundles certificate HTML/CSS assets as `.ts` modules and rewrites `issue-certificate` + `render-certificate-pdf.ts` to import them (no more `Deno.readTextFile` on unbundled assets — that was the source of the earlier crash the user hit).

**Action needed:** redeploy the edge function `issue-certificate` so the new code goes live.

## `c0a2a73` — merge (adds migration `20260724040542_836fd3e5...sql` + minor UI/types changes)
Migration re-creates the certificates schema (tables, indexes, RLS, `compute_enrollment_progress_percent`, `get_certificate_eligibility`). It uses `IF NOT EXISTS` / `DO $$ ... EXCEPTION` guards. Checked Test DB — tables and both functions already exist (applied earlier as `20260724120000_certificates.sql`).

**Action needed:** none for DB on Test. It will no-op on Live too when Publish runs.

## Heads-up (not from these commits, but blocks the fix from actually working)
`renderCertificatePdf` requires the `BROWSERLESS_API_KEY` secret; it is **not** in the project secrets. Without it, `issue-certificate` will now return a clean 500 `"BROWSERLESS_API_KEY is not configured"` instead of crashing. If you want PDF issuance to work end-to-end, we need to add that secret (and optional `BROWSERLESS_URL`).

# Plan

1. Deploy edge function: `issue-certificate` (picks up bundled asset imports).
2. Skip DB migration run — already applied on Test; will no-op on Live at publish.
3. Ask you whether to request the `BROWSERLESS_API_KEY` secret now so PDF rendering actually succeeds after deploy (or defer).
4. Remind you to click **Publish → Update** to push the merged frontend + migration to Live.
