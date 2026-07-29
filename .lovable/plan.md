## Review of recent commits (4663f95 → 7615c03)

Verified diff. Only one backend change; everything else is frontend/assets:

- `supabase/functions/_shared/certificates.ts` — verify base URL changed from `https://approachable.dev/verify` to `https://learn.approachable.dev/verify`. This is used by all certificate PDF generation, so every function importing it must be redeployed.
- Frontend: sticky pay bar + footer fix (`StickyPayBar.tsx`, `useSyncStickyPayBarHeight.ts`, `MainLayout.tsx`, `index.css`, `CourseDetail.tsx`), dark mode toggle, `package.json` dependency additions.
- Assets/meta: `public/og-image.png` deleted, `public/og_image_3.png` added, `index.html` head updated.
- No new migration files since `20260727171836_...sql`, which is already applied on Test.

## Security scan status

One `error`-level finding remains: **SUPA_security_definer_view** — the `public.cohorts_public` view is `SECURITY DEFINER` (`security_invoker = false`). This is intentional: it was set that way to fix the earlier critical `cohorts_meeting_link_exposure` finding, so that anonymous/authenticated users can browse published cohorts without the full row (which contains `meeting_link` / `group_link`). The view exposes only non-sensitive columns.

Since it is a deliberate design trade-off and it is currently blocking publish, the plan is to:
1. Re-verify the view's column list actually excludes `meeting_link` and `group_link` (query `information_schema`), and confirm no `SELECT *` leaks through.
2. If clean, mark the finding as intentionally ignored with an explanation, and record the rationale in security memory so future scans don't re-raise it.
3. If the view does expose sensitive columns, redefine it via migration to drop them before ignoring anything.

The other 6 findings are `warn`-level (quiz answer key in payload, leaderboard email leak, enrollment capacity, leaked-password protection, SECURITY DEFINER function grants, public bucket listing) — not addressed in this pass unless you want them.

## Deployment steps (Test environment)

1. Confirm Cloud status is healthy and re-check no pending migrations (`supabase--read_query` against `supabase_migrations.schema_migrations`).
2. Redeploy all certificate-related edge functions so they pick up the new verify URL: `issue-certificate`, `regenerate-certificate`, `download-certificate`, `request-certificate`, `verify-certificate`, `get-my-certificates`, `get-certificate-eligibility`, `get-certificate-requests`, `review-certificate-request`.
3. Verify the deploys booted cleanly via edge function logs.
4. Run the test suite (`bunx vitest run`) and a typecheck to confirm the frontend commits build.
5. Frontend changes are automatically live on the Test preview — spot-check the course page sticky pay bar / footer and the dark mode toggle in the preview.

## Technical notes

- No migrations to run: schema on Test already matches the repo.
- `CERTIFICATE_VERIFY_BASE_URL` secret is not set, so the new hardcoded default (`learn.approachable.dev/verify`) takes effect. If you'd rather pin it explicitly, we can add it as a secret instead.
- Publishing to Live is a separate step and is not included here — this plan targets Test only, plus clearing the publish blocker.
