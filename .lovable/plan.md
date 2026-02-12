

# Fix: Leaderboard Average Score Discrepancy

## Root Cause

The average quiz score shown in the header ("Avg Score: X%") and the leaderboard table use **different calculation methods**:

- **Header badge**: Takes only the **most recent submission per quiz**, then averages those scores. If you retook a quiz, only your latest attempt counts.
- **Leaderboard**: Averages **every submission** including all retakes. If you scored 50% then retook and got 100%, it averages both (75%) instead of just the latest (100%).

## Fix

Update the leaderboard edge function to match the cohort page logic: **use only the latest submission per quiz per user** when calculating the average score.

## Technical Details

### File: `supabase/functions/get-leaderboard/index.ts`

In the per-user score calculation section, change the logic from averaging all submissions to first deduplicating by quiz (keeping the most recent), then averaging:

1. Fetch `quiz_id` and `submitted_at` in addition to `user_id` and `score` from `quiz_submissions`
2. Order submissions by `submitted_at` descending
3. For each user, group submissions by `quiz_id` and keep only the latest one
4. Average only those latest-per-quiz scores

This aligns both displays so the numbers match exactly.

### No other files need changes

The cohort detail page logic is already correct (latest per quiz). Only the edge function needs updating.

