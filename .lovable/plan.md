

# Fix: Session Completion Trigger - Scope to User's Enrollment

## Problem
When a quiz is shared across multiple cohorts (e.g., quiz "AI agents" is linked to sessions in cohort A and cohort B), the `check_session_completion` trigger picks an arbitrary session using `LIMIT 1`. This often creates `session_progress` for a session in a cohort the user isn't even enrolled in, resulting in 0 completed sessions on the leaderboard.

## Solution
Update the trigger to only create/update `session_progress` for sessions that belong to cohorts or courses the user is actually enrolled in. This is done by joining `session_quizzes` with `sessions` and then `enrollments` to filter to relevant sessions only.

## Technical Details

**Database migration** -- Replace the `check_session_completion` function:

```sql
CREATE OR REPLACE FUNCTION public.check_session_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
  v_total_quizzes INT;
  v_completed_quizzes INT;
BEGIN
  -- Loop through sessions linked to this quiz
  -- that belong to cohorts/courses the user is enrolled in
  FOR v_session IN
    SELECT DISTINCT sq.session_id
    FROM session_quizzes sq
    JOIN sessions s ON s.id = sq.session_id
    WHERE sq.quiz_id = NEW.quiz_id
      AND (
        (s.cohort_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.user_id = NEW.user_id
            AND e.cohort_id = s.cohort_id
        ))
        OR
        (s.course_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.user_id = NEW.user_id
            AND e.course_id = s.course_id
        ))
      )
  LOOP
    -- Count total quizzes for this session
    SELECT COUNT(*) INTO v_total_quizzes
    FROM session_quizzes WHERE session_id = v_session.session_id;

    -- Count completed quizzes by this user for this session
    SELECT COUNT(DISTINCT qs.quiz_id) INTO v_completed_quizzes
    FROM quiz_submissions qs
    JOIN session_quizzes sq ON sq.quiz_id = qs.quiz_id
    WHERE sq.session_id = v_session.session_id
      AND qs.user_id = NEW.user_id;

    -- Upsert session_progress
    INSERT INTO session_progress (user_id, session_id, is_completed, completed_at)
    VALUES (
      NEW.user_id,
      v_session.session_id,
      v_completed_quizzes >= v_total_quizzes,
      CASE WHEN v_completed_quizzes >= v_total_quizzes THEN now() ELSE NULL END
    )
    ON CONFLICT (user_id, session_id)
    DO UPDATE SET
      is_completed = v_completed_quizzes >= v_total_quizzes,
      completed_at = CASE
        WHEN v_completed_quizzes >= v_total_quizzes THEN COALESCE(session_progress.completed_at, now())
        ELSE session_progress.completed_at
      END,
      updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;
```

**Key change**: Instead of `LIMIT 1`, the trigger now:
1. Loops through all sessions linked to the quiz
2. Filters to only sessions in cohorts/courses the user is enrolled in
3. Upserts progress for each matching session

**Backfill for Live**: After publishing, run this on the **Live** database (Cloud View > Run SQL with Live selected) to fix existing incorrect `session_progress` records:

```sql
-- Delete session_progress where user is NOT enrolled in the session's cohort/course
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

-- Re-insert correct progress for users with quiz submissions
INSERT INTO session_progress (user_id, session_id, is_completed, completed_at)
SELECT DISTINCT
  qs.user_id,
  sq.session_id,
  true,
  MAX(qs.submitted_at)
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
