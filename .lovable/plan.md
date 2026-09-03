# Deploy last merge (PR #20 — Guides / text-based courses) to Test

## What the merge contains

Merge `1c53280` (PR #20, from `frontend-dashboard-changes`) adds:

- **Migration**: `supabase/migrations/20260903120000_guide_courses.sql`
  - `courses.is_text_course` column
  - New tables `guide_chapters` and `guide_chapter_progress` with GRANTs, RLS policies, indexes, and updated_at triggers
  - Depends on existing helpers `public.is_admin()` and `public.update_updated_at_column()` — both confirmed present on Test
- **Frontend only**: `GuidesAdminTab`, `GuideCourseForm`, `GuideChapterManager`, `GuidesCoursesGrid`, `GuideCourseDetail` page, route and grid wiring

**No edge functions were added or changed in this merge** — nothing to deploy for functions. (The `get-corporate-inquiries` / `delete-submission` functions from the earlier PR #18 merge are already deployed on Test.)

Current Test DB state: `guide_chapters` and `guide_chapter_progress` do NOT exist yet — the migration has not been applied.

## Plan

1. Run migration `20260903120000_guide_courses.sql` on the Test database.
2. Verify: both tables exist, RLS enabled, and an authenticated read against `guide_chapters` works.
3. No edge function deploys needed (no function changes in this merge).
4. Frontend goes live via Publish only — after you verify the Guides admin tab and learner view on the Test preview.

## Technical details

- Migration is additive only; idempotent on the `courses` column (`IF NOT EXISTS`). Table creates are not idempotent, so it will be run exactly once — safe since the tables do not exist yet.
- Live (production) needs the same migration applied at publish/go-live time as a separate explicit step.
