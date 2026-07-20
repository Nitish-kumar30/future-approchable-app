# Sync "AI Mastery for Working Professionals" content: Test → Live

## Current state (verified)

Course row exists in both Test and Live with the same `id` (`96be8221-…9ee352`). Session IDs also match for the 2 sessions already in Live, so we can upsert by primary key without breaking existing enrollments or progress.

| Entity              | Test | Live |
| ------------------- | ---- | ---- |
| sessions            | 5    | 2    |
| chapters            | 48   | 24   |
| session_quizzes     | 4    | 2    |
| quizzes referenced  | 4    | 2    |
| pre_reading_materials | 5  | 0    |
| mini_projects       | 3    | 0    |
| enrollments (Live)  | —    | 4 (preserved) |

## Approach

Generate a single SQL script that you run once in the Live SQL editor. It performs an idempotent upsert (INSERT … ON CONFLICT (id) DO UPDATE) for every row currently in Test, in FK-safe order:

1. `UPDATE courses` — sync metadata (name, description, prices, image, is_published, etc.) for the AI Mastery row.
2. Upsert `sessions` (5 rows) — matches existing session IDs, updates titles/order/urls, inserts the 3 missing.
3. Upsert `chapters` (48 rows) — safe because `chapter_progress` FKs by chapter_id; existing IDs keep their progress.
4. Upsert `quizzes` (4 rows) — updates titles/questions of the 2 present, inserts the 2 missing.
5. Upsert `session_quizzes` (4 rows).
6. Upsert `pre_reading_materials` (5 rows).
7. Upsert `mini_projects` (3 rows).

Nothing is deleted. Live-only rows (enrollments, chapter_progress, session_progress, quiz_submissions, course_ratings, payments) are untouched.

## Deliverable

A file `ai-mastery-live-sync.sql` containing the generated INSERT…ON CONFLICT statements with the exact current Test values baked in. You'll:

1. Open Cloud → SQL editor, switch environment to **Live**.
2. Paste and run the script.
3. Verify `learn.approachable.dev/courses/ai-mastery-for-working-professionals` shows all 5 sessions with chapters, quizzes, pre-readings, and mini-projects.

## Notes / caveats

- Chapter `hls_url`s copy over as-is. If any recordings are private/DRM-scoped per environment, they'll need re-issuing; based on schema they appear to be plain HLS URLs so this should just work.
- Quiz `questions` JSONB is copied verbatim, so existing Live submissions for the 2 shared quizzes remain valid.
- If you later add more content in Test, re-running the same generated script won't hurt but will overwrite any Live-only edits to these rows — treat Test as the source of truth for this course going forward.
