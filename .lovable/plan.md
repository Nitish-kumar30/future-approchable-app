## Deploy recent commits to Test

Reviewed commits `903f20e` → `8044d1e`. Frontend is already live on the Test preview; the backend is behind. Two migrations and several edge functions still need to go out.

### 1. Migrations to apply (verified missing on Test)

- **`20260716140000_restrict_paid_course_self_enroll.sql`** — `public.is_paid_course()` does not exist on Test. This is currently breaking things: `request-certificate` calls this function for course certificates, so every course certificate request fails with "Failed to verify course". The same migration also tightens the self-enroll policy on paid courses.
- **`20260727120000_course_progress_include_course_quizzes.sql`** — `compute_enrollment_progress_percent` on Test is the old version (confirmed: no course-level quiz handling). Course progress therefore doesn't count course-level quizzes, so the certificate eligibility % disagrees with what CourseDetail shows.

### 2. Open security finding (still unfixed on Test)

`public.cohorts` still has both `Authenticated users can view published cohorts` and `Enrolled users and admins can view cohorts`. The first one grants full-row access — including `meeting_link` and `group_link` — to any logged-in user. Fix: drop that policy and expose only non-sensitive cohort columns for browsing (via the existing public view path used by `Cohorts.tsx`), leaving full-row access to the enrollment-gated policy.

I'll fold this into the same deploy unless you want it handled separately.

### 3. Edge functions to redeploy

Changed in recent commits:
- `request-certificate` (LinkedIn field required for all tiers, paid-course check)
- `regenerate-certificate` (new `verify_jwt = false` config block)
- `get-certificate-requests`
- `issue-certificate` (picks up shared `issue-certificate-core.ts` course-name fix)

### 4. Frontend

Auto-deployed to the Test preview: toast/dialog error fixes, footer spacing, certificate panel LinkedIn field, Advanced tier removed for courses, course name fix, Registration tweaks. Live requires **Publish → Update**.

### Known gap

`BROWSERLESS_API_KEY` is still not configured, so PDF issuance will keep failing with a clean "not configured" error until it's added.
