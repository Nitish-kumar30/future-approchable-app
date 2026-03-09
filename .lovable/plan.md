

## Plan: Fix Sensitive URL Exposure

### Problem
RLS on `sessions` allows public SELECT when the parent course/cohort is published, exposing `recording_url` and `presentation_url`. The `cohorts` table exposes `meeting_link` and `group_link` publicly when `is_published = true`. While the UI hides these from non-enrolled users, anyone can query the API directly.

### Strategy
Since Postgres RLS is row-level (not column-level), we cannot restrict specific columns. The fix is to **tighten the RLS policies** and create **edge functions** to serve public-safe metadata.

---

### 1. Database Migration: Tighten Sessions RLS

Replace the current sessions SELECT policy with one that removes public access:

```sql
DROP POLICY "Sessions viewable for published courses or enrolled users" ON sessions;

-- Public can only see non-sensitive session metadata via edge function
-- Direct table access requires enrollment or admin
CREATE POLICY "Sessions viewable by enrolled users or admins"
ON sessions FOR SELECT USING (
  is_admin()
  OR (cohort_id IS NOT NULL AND is_enrolled_in_cohort(auth.uid(), cohort_id))
  OR (course_id IS NOT NULL AND is_enrolled_in_course(auth.uid(), course_id))
);
```

### 2. Edge Function: `get-public-sessions`

New edge function (no JWT required) that returns only safe session fields for published courses/cohorts. Uses service role to query, but strips sensitive columns.

- Input: `course_id` or `cohort_id` query param
- Validates the course/cohort is published
- Returns: `id, title, description, session_date, session_order` only
- No `recording_url`, `presentation_url`, or `is_content_unlocked`

### 3. Edge Function: `get-cohort-detail`

New edge function that returns cohort data. For non-enrolled users, strips `meeting_link` and `group_link`. For enrolled users (verified via JWT), returns all fields.

- Input: `cohort_id` query param, optional auth token
- Returns full data if enrolled, safe data if not

### 4. Frontend Changes

**`src/pages/CourseDetail.tsx`**:
- `fetchSessions()` (non-enrolled path): Call `get-public-sessions?course_id=X` edge function instead of querying sessions table directly

**`src/pages/CohortDetail.tsx`**:
- `fetchCohort()`: Call `get-cohort-detail?cohort_id=X` edge function instead of `select('*')` on cohorts
- `fetchSessions()` (non-enrolled path): Call `get-public-sessions?cohort_id=X`

**`src/pages/OnDemandCourseDetail.tsx`**:
- `fetchCourseData()`: Split session fetch — use `get-public-sessions` initially, then fetch full data from sessions table only after user is confirmed enrolled (or for on-demand, after auth check)

**`src/pages/Courses.tsx` and `src/pages/LiveCourses.tsx`**:
- No changes needed — these only query the `courses` table which doesn't have sensitive URLs

### 5. Config: Disable JWT for new edge functions

Add to `supabase/config.toml`:
```toml
[functions.get-public-sessions]
verify_jwt = false

[functions.get-cohort-detail]
verify_jwt = false
```

### Summary of Files Changed
| File | Change |
|------|--------|
| DB migration | Tighten sessions SELECT RLS |
| `supabase/functions/get-public-sessions/index.ts` | New edge function |
| `supabase/functions/get-cohort-detail/index.ts` | New edge function |
| `supabase/config.toml` | Disable JWT for new functions |
| `src/pages/CourseDetail.tsx` | Use edge function for public sessions |
| `src/pages/CohortDetail.tsx` | Use edge functions for public cohort + sessions |
| `src/pages/OnDemandCourseDetail.tsx` | Use edge function for public sessions |

