# Why Session 1 shows "completed" with 0 chapters and 0 quizzes

## What the data shows (Live)

For `sridhar.ambati@gmail.com`, the row in your screenshot is the course session **"Introduction to AI & Kickoff"** (AI Mastery course), which has **15 chapters and 1 quiz**. His progress there is:

- chapter_progress completed for that session: **0**
- submissions for that session's quiz (`Session 1: AI Mastery: Quiz 1: AI Overview`): **none**
- session_progress: `is_completed = true`, `completed_at = 2026-07-29 14:11:38.117123+00`

That timestamp is *exactly* the timestamp of a different submission: the cohort quiz `Session 1: Quiz 1: AI Overview` (a different quiz id), submitted at 14:11:38.117123+00 for Cohort 6.

## Cause

Two things combine:

1. **Session completion is decided only by quizzes.** The `check_session_completion()` trigger fires on quiz submission and marks a session complete when submitted quizzes >= session quizzes. It never looks at chapters. So a course session with 15 chapters can be flagged complete without a single chapter watched.
2. **The completion was written against the wrong session.** The trigger marks every session linked to the submitted quiz where the user is enrolled. The course session was evidently linked to the shared cohort quiz at submission time; it is now linked to a duplicated copy of that quiz (the duplicate-quiz flow creates a new quiz id). The old `session_progress` row stayed behind as stale `true`.

Net effect: the course session shows completed, while the chapter and quiz counts for it are genuinely 0.

## Proposed fix

1. **Make session completion require chapters too.** Update `check_session_completion()` (and `recompute_session_completion()`) so a session counts as complete only when all its chapters are completed AND all its quizzes are submitted. Sessions with zero chapters keep quiz-only behaviour.
2. **Fire recomputation on chapter progress as well**, so completion is kept accurate in both directions (also un-set `is_completed` when it no longer holds).
3. **Backfill/repair**: recompute `session_progress` for all users against current chapter/quiz links, clearing stale `true` rows like this one.
4. Optionally, guard the duplicate-quiz flow so re-pointing a session's quiz triggers a recompute for affected users.

## Technical notes

- Changes are DB-side: migration updating `public.check_session_completion()` and `public.recompute_session_completion()`, plus a trigger on `chapter_progress`, plus a one-time backfill UPDATE.
- Applies to Test first; Live is updated on publish. The Live rows currently marked incorrectly complete would need the same repair statement run against Live via the SQL editor (data changes never sync from Test).
- Progress percentages shown for courses come from `compute_enrollment_progress_percent`, which already counts chapters + quizzes, so course % is unaffected; only per-session completion flags change.
