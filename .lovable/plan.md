

# Cohort Detail Page: Tabbed Layout with Enrolled-Only Leaderboard

## Overview
Reorganize the cohort detail page into four tabs: **About**, **Sessions**, **Mentor**, and **Leaderboard**. The leaderboard tab is visible to everyone but its content is only shown to enrolled students -- non-enrolled users see a message prompting them to enroll.

## Tab Structure

| Tab | Content | Access |
|-----|---------|--------|
| About | Description, progress card (enrolled), quick links (enrolled) | Everyone |
| Sessions | Session list with gated content (existing behavior preserved) | Everyone (content gated) |
| Mentor | Mentor name and info | Everyone |
| Leaderboard | Ranked table of learners | Enrolled only; non-enrolled see enroll prompt |

## Technical Details

### 1. Edge Function: `supabase/functions/get-leaderboard/index.ts`
- Add support for a `allow_enrolled=true` query parameter when `cohort_id` is provided
- When this flag is set, skip the admin role check but still require authentication
- Verify the requesting user is enrolled in the cohort before returning data
- This keeps the admin-only behavior intact for all other use cases

### 2. Page: `src/pages/CohortDetail.tsx`
- Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- Keep the header section (back button, title, mentor name, enroll button, meta info) above the tabs
- Replace the current linear layout below the `<Separator />` with four tabs:

**About tab:**
- Progress card (enrolled only)
- Cohort description
- Quick links card (enrolled only, if meeting/group links exist)

**Sessions tab:**
- Existing session list with all enrolled/non-enrolled content gating preserved exactly as-is

**Mentor tab:**
- Mentor name and mentor_info rendered with Markdown
- "No mentor information available" fallback

**Leaderboard tab:**
- If enrolled: fetch leaderboard data from the edge function (lazy-loaded on tab select) and display a table with rank, name, avg quiz score, quizzes attempted, sessions completed, and completion percentage
- If not enrolled: show a card with a message like "Enroll in this cohort to view the leaderboard" and an "Enroll Now" button (or "Enrollment Closed" badge if disabled)

### 3. New state and logic in CohortDetail
- Add `leaderboardData` state and `isLeaderboardLoading` state
- Add a `fetchLeaderboard` function that calls the edge function with `cohort_id` and `allow_enrolled=true`
- Trigger the fetch when the Leaderboard tab is selected and user is enrolled (avoid re-fetching)

### 4. No database changes required
The edge function already returns all the needed data fields. Only the authorization logic needs adjustment.

## Files Modified
1. `supabase/functions/get-leaderboard/index.ts` -- allow enrolled learners for cohort leaderboards
2. `src/pages/CohortDetail.tsx` -- restructure into tabs, add leaderboard tab with enrollment gate

