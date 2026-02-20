

# Feedback System for Courses and Cohorts

## What's changing

A reusable feedback dialog lets logged-in learners rate (1--5 stars) and optionally leave a written comment on any course or cohort. A "Leave Feedback" button appears in the header area of both the On-Demand Course Detail and Cohort Detail pages (only when the user is logged in / enrolled). Existing feedback is pre-populated for editing.

## Database

Create a `feedback` table:

```sql
CREATE TABLE public.feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  cohort_id   uuid REFERENCES public.cohorts(id) ON DELETE CASCADE,
  rating      integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id),
  UNIQUE(user_id, cohort_id)
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feedback"
  ON public.feedback FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
```

The `UNIQUE` constraints allow upsert so users can edit their feedback. Both `course_id` and `cohort_id` are nullable -- one row handles either type.

## New file: `src/components/FeedbackDialog.tsx`

A reusable dialog component.

**Props:**
- `open`, `onOpenChange` -- dialog visibility
- `courseId?`, `cohortId?` -- which entity to attach feedback to
- `entityName` -- displayed in the title ("Leave feedback for {entityName}")

**Behavior:**
- On open: fetches existing feedback for the current user + entity and pre-populates rating/comment if found (edit mode)
- 5 clickable `Star` icons (lucide-react) -- filled yellow when selected, outline otherwise
- Optional comment textarea
- Submit upserts into `feedback` with `onConflict: 'user_id,course_id'` or `'user_id,cohort_id'`
- Shows success toast on submit

## Changes to existing pages

### `src/pages/OnDemandCourseDetail.tsx`
- Import `FeedbackDialog` and `MessageSquare` icon
- Add state: `feedbackOpen`
- In the course header bar (next to course name / mentor), add a ghost "Feedback" button (only when `user` is set). Clicking it opens the `FeedbackDialog` with `courseId={course.id}` and `entityName={course.name}`.

### `src/pages/CohortDetail.tsx`
- Import `FeedbackDialog` and `MessageSquare` icon
- Add state: `feedbackOpen`
- In the header area, next to the Enrolled badge (only shown when `isEnrolled`), add a ghost "Feedback" button. Opens `FeedbackDialog` with `cohortId={cohort.id}` and `entityName={cohort.name}`.

## Files changed

| File | Change |
|---|---|
| Migration SQL | Create `feedback` table + RLS policies |
| `src/components/FeedbackDialog.tsx` | New reusable component |
| `src/pages/OnDemandCourseDetail.tsx` | Add Feedback button + dialog (logged-in users) |
| `src/pages/CohortDetail.tsx` | Add Feedback button + dialog (enrolled users) |

