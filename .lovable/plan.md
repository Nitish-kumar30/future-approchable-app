## Goal

Replace the flat session list on `/courses/:slug` with an accordion "Course Content" module (matching the reference mockup) for **both enrolled and unenrolled users**. Remove the "This session's content will be available soon." copy entirely.

## Behavior

Same layout for everyone:
- One accordion per session, header `Section {N} : {session.title}` (first section open by default).
- Numbered chapter rows inside each section: `{n}  {chapter.title}`.
- Quizzes (enrolled only) appended after chapters as `Quiz: <title>` rows.

Row interaction:

| State | Row click | Preview button |
|---|---|---|
| Unenrolled, chapter `is_preview=true` | Opens preview video in modal | Shown (also opens modal) |
| Unenrolled, chapter `is_preview=false` | Non-clickable (muted) | Hidden |
| Unenrolled, quiz row | Hidden (not rendered) | — |
| Enrolled, chapter (any) | Navigates to `/courses/:slug/learn?chapter={id}` | Hidden |
| Enrolled, quiz | Navigates to `/courses/:slug/learn?quiz={id}` | Hidden |

The "Enroll to access lesson materials and quizzes" placeholder card and the `Lock` "will be available soon" line are both removed.

## Data (new edge function)

Create `supabase/functions/get-course-curriculum/index.ts` (anon-callable, service role internally):
- Input: `?slug=<course-slug>`; optional Bearer token to detect enrollment.
- Output:
  ```
  {
    course: { id, slug, title },
    is_enrolled: boolean,
    sessions: [{
      id, title, session_order,
      chapters: [{ id, title, chapter_order, is_preview, hls_url|null }],
      quizzes:  [{ id, title }]   // only when is_enrolled
    }]
  }
  ```
  `hls_url` is included only when the caller can watch it (chapter `is_preview = true` or enrolled).

## Frontend

`src/pages/CourseDetail.tsx`
- Fetch curriculum via the new edge function after course + enrollment resolve.
- Replace the entire "Course Content" block (both enrolled and unenrolled branches) with `<CourseContentAccordion />`.
- Delete the `Lock` "will be available soon" text and the "Enroll to access lesson materials and quizzes" placeholder.
- Leave hero, about, instructor, ratings, community progress, and standalone course-level quizzes untouched.

New `src/components/course/CourseContentAccordion.tsx`
- shadcn `Accordion type="multiple" defaultValue={[firstSessionId]}`.
- Renders sessions/chapters/quizzes per the interaction table above.
- Uses semantic tokens (no hardcoded colors).

New `src/components/course/ChapterPreviewDialog.tsx`
- shadcn `Dialog` wrapping `HlsPlayer` for the unenrolled preview flow.

`src/pages/CourseLearn.tsx`
- Use `useSearchParams` to read `?chapter=` / `?quiz=` on load.
- If present and found in curriculum, initialize `selected` to that item (and set `currentSessionId` accordingly) instead of the default first-unwatched item.

## Out of scope

- Admin chapter manager, progress tracking, learn workspace layout — unchanged beyond the deep-link initialization above.
- `CohortDetail.tsx` — no changes.
