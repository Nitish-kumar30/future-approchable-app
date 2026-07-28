## Review of commits since the last Test sync (`f128c44` → `4663f95`)

Verified against the Test database directly.

### Nothing new on the backend
The four commits since the last sync (`26c02a9`, `9065d9f`, `0282912`, `b944b70`, `ec1664a`, `4663f95`) touch **frontend files only** — no new files under `supabase/migrations/` and no changes under `supabase/functions/`.

Changed: `index.html` + og-image/meta tags, `Auth.tsx` and new `src/lib/authRedirect.ts` (login `next` param redirect), `HlsPlayer.tsx` / `VimeoPlayer.tsx` + new `src/lib/videoPlaybackPrefs.ts` (persisted volume and playback speed), plus small layout/header/payment-button tweaks and two new test files.

### Database state confirmed current on Test
- `is_paid_course`, `upsert_chapter_progress`, `compute_enrollment_progress_percent` all present.
- `cohorts` policies: only the admin policies and `Enrolled users and admins can view cohorts` — the broad authenticated-read policy is gone, so the meeting/group link finding stays fixed.
- `cohorts_public` view exists for browsing.

### What I'd do if you approve
1. Redeploy edge functions that read shared code, purely as a no-op refresh — or skip entirely, since none changed. My recommendation: skip.
2. Confirm the frontend changes on the Test preview (login redirect with `?next=`, video volume/speed persistence).

### Known gap (unchanged)
`BROWSERLESS_API_KEY` is still not configured, so certificate PDF issuance keeps returning the "not configured" error. Say the word and I'll open the secure form to add it.

### Live
Frontend changes require **Publish → Update** to reach Live. Live also still needs the two migrations and the cohorts policy fix pushed via that same publish, since those only applied to Test.
