## Why it happens today

Two gates hide those rows from unenrolled visitors:

1. `supabase/functions/get-course-curriculum/index.ts` only fetches `session_quizzes`, `pre_reading_materials`, and `mini_projects` when `isEnrolled === true`. For everyone else the arrays come back empty.
2. `src/components/course/CourseContentAccordion.tsx` wraps the quiz / pre-reading / mini-project `<li>` rows in `isEnrolled && …`, so even if data were present they wouldn't render.

Chapters slip through because they're always fetched, and each row renders regardless of enrollment (with a `Lock` icon when `is_preview` is false).

## Plan — show them as locked rows for unenrolled users

Match the chapter pattern: everyone sees the item exists, only enrolled users can open it.

1. **Edge function `get-course-curriculum`**
   - Remove the `isEnrolled` guard around the three fetches.
   - When `!isEnrolled`, return only the **title** (and `id`, `display_order`) for pre-readings and mini-projects — strip `link` and `description` server-side. Quizzes already expose only `id` + `title`.
   - Enrolled users still get `link` and `description` as before.

2. **`CourseContentAccordion.tsx`**
   - Drop the `isEnrolled &&` wrapper on the three row groups.
   - Unenrolled: render each row like a locked chapter — small lock icon, muted text, no click handler, no external-link icon, no dialog.
   - Enrolled: keep today's behavior (clickable, opens quiz/mini-project dialog, opens pre-reading link in a new tab).

Result: unenrolled visitors see the full syllabus outline (chapters, quizzes, pre-readings, mini-projects) with locks; no URLs or project descriptions leak. No DB, RLS, or Learn-workspace changes needed.
