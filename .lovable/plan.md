

# Fix: Session Completion Trigger -- Still Using Buggy LIMIT 1

## Root Cause

The previously approved fix was **never actually applied**. Both Test and Live databases still have the old `check_session_completion` function that uses `LIMIT 1` to pick a single session for a quiz. When a quiz is shared across multiple cohorts, this picks an arbitrary session -- often one belonging to a different cohort than the user is enrolled in -- so `session_progress` gets created for the wrong session and the leaderboard shows 0 completed sessions.

Additionally, there are **two duplicate triggers** (`check_session_completion_trigger` and `on_quiz_submission_check_completion`) both firing the same function on every quiz submission, which is redundant.

## What Will Change

A single database migration that:

1. **Replaces** the `check_session_completion` function with the enrollment-scoped version that loops through all sessions linked to a quiz, filtered to only sessions in cohorts/courses the user is enrolled in
2. **Drops** the duplicate trigger `on_quiz_submission_check_completion` (keeping only `check_session_completion_trigger`)

## After Publishing

You will need to run a **backfill query** on the Live database (via Cloud View, Run SQL with Live selected) to fix existing incorrect `session_progress` records:

```sql
-- Step 1: Delete session_progress where user is NOT enrolled
DELETE FROM session_progress sp
WHERE NOT EXISTS (
  SELECT 1 FROM sessions s
  JOIN enrollments e ON e.user_id = sp.user_id
  WHERE s.id = sp.session_id
    AND (
      (s.cohort_id IS NOT NULL AND e.cohort_id = s.cohort_id)
      OR (s.course_id IS NOT NULL AND e.course_id = s.course_id)
    )
);

-- Step 2: Re-insert correct progress
INSERT INTO session_progress (user_id, session_id, is_completed, completed_at)
SELECT DISTINCT
  qs.user_id, sq.session_id, true, MAX(qs.submitted_at)
FROM quiz_submissions qs
JOIN session_quizzes sq ON sq.quiz_id = qs.quiz_id
JOIN sessions s ON s.id = sq.session_id
JOIN enrollments e ON e.user_id = qs.user_id
  AND (
    (s.cohort_id IS NOT NULL AND e.cohort_id = s.cohort_id)
    OR (s.course_id IS NOT NULL AND e.course_id = s.course_id)
  )
GROUP BY qs.user_id, sq.session_id
HAVING COUNT(DISTINCT qs.quiz_id) >= (
  SELECT COUNT(*) FROM session_quizzes sq2 WHERE sq2.session_id = sq.session_id
)
ON CONFLICT (user_id, session_id) DO UPDATE SET
  is_completed = true,
  completed_at = COALESCE(session_progress.completed_at, EXCLUDED.completed_at),
  updated_at = now();
```

No frontend code changes needed.

