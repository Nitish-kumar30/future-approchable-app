

# Add Leaderboard Tab to Admin Panel

## Overview
Add a new "Leaderboard" tab next to the "Enrollments" tab in the Admin Panel that displays student rankings based on their quiz performance and session completion within a selected cohort or course.

## What You'll Get
- A new tab showing student rankings for any cohort or course
- Students ranked by average quiz score and completion percentage
- Clear visibility into top performers and those who may need support
- Same mandatory filter pattern as Enrollments (select cohort/course first)

## Implementation Steps

### 1. Create Edge Function: `get-leaderboard`

Create a new edge function at `supabase/functions/get-leaderboard/index.ts` that:
- Authenticates the request and verifies admin role (same pattern as get-enrollments)
- Requires either `cohort_id` or `course_id` as a query parameter
- Calculates leaderboard data for each enrolled user:
  - Average quiz score (from `quiz_submissions`)
  - Sessions completed count and percentage (from `session_progress`)
  - Total quizzes attempted
- Returns ranked student data with scores

**Response format:**
```text
{
  leaderboard: [
    {
      user_id: string,
      user_name: string | null,
      user_email: string,
      avg_quiz_score: number,
      quizzes_attempted: number,
      sessions_completed: number,
      total_sessions: number,
      completion_percentage: number
    }
  ]
}
```

### 2. Update supabase/config.toml

Add configuration for the new edge function.

### 3. Update Admin.tsx

**Add new state variables:**
- `leaderboard` - array of leaderboard entries
- `leaderboardFilter` - filter state (defaults to empty string)
- `leaderboardLoading` - loading state

**Add new interface:**
```text
interface LeaderboardEntry {
  user_id: string
  user_name: string | null
  user_email: string
  avg_quiz_score: number
  quizzes_attempted: number
  sessions_completed: number
  total_sessions: number
  completion_percentage: number
}
```

**Update TabsList:**
- Add 6th tab "Leaderboard" with Trophy icon
- Update grid from `grid-cols-5` to `grid-cols-6`

**Add TabsContent for leaderboard:**
- Same filter dropdown pattern as Enrollments (mandatory selection)
- Placeholder when no filter selected
- Table with columns:
  - Rank (#)
  - Student Name
  - Email
  - Avg Quiz Score (with progress bar or badge)
  - Sessions Completed (X/Y format)
  - Completion %

### 4. UI Layout

**Initial state (no filter selected):**
```text
+------------------------------------------------------------------+
| Leaderboard Tab                                                   |
+------------------------------------------------------------------+
| [Leaderboard]                    [Filter: Select cohort/course ▼] |
| View student rankings                                             |
+------------------------------------------------------------------+
|                                                                   |
|     Select a cohort or course to view the leaderboard             |
|                                                                   |
+------------------------------------------------------------------+
```

**After filter selection:**
```text
+------------------------------------------------------------------+
| Leaderboard Tab                                                   |
+------------------------------------------------------------------+
| [Leaderboard (5 students)]             [Filter: Cohort ABC     ▼] |
| View student rankings                                             |
+------------------------------------------------------------------+
| #  | Name       | Email           | Avg Score | Sessions | Done  |
|----|------------|-----------------|-----------|----------|-------|
| 1  | Jane Smith | jane@email.com  | 92%       | 4/5      | 80%   |
| 2  | John Doe   | john@email.com  | 85%       | 3/5      | 60%   |
| 3  | Bob Wilson | bob@email.com   | 78%       | 2/5      | 40%   |
+------------------------------------------------------------------+
```

## Technical Details

### Edge Function Logic

```text
1. Handle CORS preflight (OPTIONS request)
2. Extract and verify JWT token
3. Create authenticated Supabase client
4. Verify admin role
5. Parse query params - require cohort_id or course_id
6. Fetch all enrollments for the cohort/course
7. Fetch all sessions for the cohort/course (to get total count)
8. For each enrolled user:
   - Get session_progress records to count completed sessions
   - Get quiz_submissions for quizzes linked to those sessions
   - Calculate average score
   - Fetch profile name and auth email
9. Sort by avg_quiz_score descending (tie-breaker: sessions_completed)
10. Return ranked leaderboard array
```

### Sorting Logic
Students are ranked primarily by average quiz score (highest first). If scores are tied, students with more completed sessions rank higher.

### Files to Create/Modify
1. `supabase/functions/get-leaderboard/index.ts` - New edge function
2. `supabase/config.toml` - Add function configuration  
3. `src/pages/Admin.tsx` - Add Leaderboard tab UI and logic

## Visual Enhancements
- Top 3 students could have gold/silver/bronze indicators
- Score column uses color coding (green for 80%+, yellow for 50-79%, red for below 50%)
- Progress bar for completion percentage

