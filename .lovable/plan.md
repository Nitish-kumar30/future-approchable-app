## Publish to Live

### Pre-check status
- Test DB verified current: `is_paid_course`, `upsert_chapter_progress`, `compute_enrollment_progress_percent` all present; `cohorts_public` view exists.
- `cohorts` policies contain only the admin policies and `Enrolled users and admins can view cohorts` — the broad authenticated-read policy is gone.
- Recent commits (`26c02a9` → `4663f95`) are frontend-only; no pending edge function or migration changes.
- `BROWSERLESS_API_KEY` is now configured, so certificate PDF issuance should work.

### Blocker to clear first
The security scan still lists one **error**-level finding, `cohorts_meeting_link_exposure` (scanner `supabase_lov`), which blocks publishing. This is stale — the leaky policy was already dropped on Test. Step 1 marks it as fixed with that explanation.

Remaining findings are all `warn` level and do not block: quiz answer-key exposure in the client payload, enrollment capacity not enforced server-side, leaked-password protection disabled, SECURITY DEFINER function execute grants, public bucket listing. None of these are new to this release.

### Steps
1. Mark `cohorts_meeting_link_exposure` as fixed, noting the policy removal and the `cohorts_public` view as the browsing path.
2. Publish to Live.

### What publishing pushes
- Frontend: login `?next=` redirect, video volume/speed persistence, og/meta tag updates, layout/header/payment-button tweaks.
- Backend: the certificate schema, the `cohorts` policy fix, `is_paid_course`, and the atomic chapter-progress migration reach Live with this publish.

### After publish
Live database **data** is not copied from Test — any Live-side content (courses, cohorts, chapters) still needs to exist in Live. Worth spot-checking the Live course pages and one certificate download once the deploy finishes (~1 minute).
