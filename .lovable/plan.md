

# Fix Cohort Session Progress (Production Bug)

## Problem

Cohort session progress always shows "0 of X sessions completed" even after completing quizzes. The progress bar never updates.

## Root Cause

The database function `check_session_completion()` exists and is designed to automatically mark sessions as complete when all their quizzes are submitted. However, **no trigger was ever created** to call this function when a row is inserted into `quiz_submissions`. So quiz completions never write to `session_progress` for cohort sessions.

On-demand courses are unaffected because they have client-side code that manually updates `session_progress`.

## Fix

### 1. Create the missing database trigger

Add a trigger on the `quiz_submissions` table that fires `check_session_completion()` after each insert. This will automatically update `session_progress` whenever a quiz is submitted -- for both cohorts and courses.

```sql
CREATE TRIGGER on_quiz_submission_check_completion
  AFTER INSERT ON public.quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_session_completion();
```

### 2. Backfill existing progress (one-time)

For users who already submitted quizzes in production but never got their progress recorded, we need to provide a backfill query. This will be a one-time SQL statement the admin runs against the Live database to retroactively populate `session_progress` rows for completed sessions.

## What changes

| Change | Detail |
|---|---|
| Database migration | Create trigger `on_quiz_submission_check_completion` on `quiz_submissions` |
| No code changes | The existing `check_session_completion` function and `CohortDetail.tsx` progress logic are already correct |

## After publishing

Since the trigger only fires for new quiz submissions, existing production users with missing progress will need a backfill. A SQL query will be provided to run in Cloud View > Run SQL (with Live selected) to fix historical data.

