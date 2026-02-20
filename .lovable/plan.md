

# Auto-Enroll On-Demand Course Users on First Video Play

## What's changing

On-demand courses currently have no enrollment record -- users just log in and watch. This means the admin Enrollments and Leaderboard tabs show nothing for on-demand courses. We'll silently create an enrollment record when a user starts watching their first video, making on-demand learners visible in admin views alongside cohort/course enrollments.

## How it works

When a Vimeo video starts playing in an on-demand course, we check if the user already has an enrollment for that course. If not, we insert one. This happens once per course, silently in the background -- no UI change for the learner.

```text
User clicks play on first video
        |
        v
  Check enrollments table
  for (user_id, course_id)
        |
   +----+----+
   |         |
 Exists    Missing
   |         |
 Do nothing  Insert enrollment
               row silently
```

## Technical details

### `src/pages/OnDemandCourseDetail.tsx`

1. Add state to track whether auto-enrollment has been handled for this course: `autoEnrolledRef = useRef(false)`
2. Add a new callback `handleAutoEnroll` that:
   - Checks the ref to avoid duplicate calls
   - Queries `enrollments` for the current `(user_id, course_id)` pair
   - If no row exists, inserts one
   - Sets the ref to `true` regardless
3. Pass a new `onPlay` prop to `VimeoPlayer` that calls `handleAutoEnroll`

### `src/components/session/VimeoPlayer.tsx`

1. Add an optional `onPlay?: () => void` prop
2. Listen to the Vimeo player's `play` event and call `onPlay()` on the first fire (using a ref to fire only once)

### No database changes needed

The `enrollments` table already supports `course_id` and has the right RLS policies ("Users can enroll themselves" with `user_id = auth.uid()`). The existing admin Enrollments edge function and Leaderboard edge function already query by `course_id`, so on-demand enrollments will appear automatically in both admin views.

## Files changed

| File | Change |
|---|---|
| `src/components/session/VimeoPlayer.tsx` | Add `onPlay` prop, listen to Vimeo `play` event |
| `src/pages/OnDemandCourseDetail.tsx` | Add auto-enrollment logic, pass `onPlay` to VimeoPlayer |

