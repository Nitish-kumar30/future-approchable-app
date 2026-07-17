## Problem
Admins attach **pre-reading materials** and **mini-projects** to sessions, but only quizzes surface in:
- Course detail syllabus (`CourseContentAccordion`)
- Learn workspace sidebar (`CourseSidebar` / `CourseLearn`)

The edge functions powering these views never fetch those rows.

## Plan

### 1. Edge function `get-course-curriculum`
For enrolled users, also fetch `pre_reading_materials` (id, title, link, display_order) and `mini_projects` (id, title, description, display_order) for the session IDs. Add both arrays per session in the payload.

### 2. Edge function `get-course-learn`
Same additions, so the learn workspace has the data.

### 3. `CourseContentAccordion` (course detail page)
Under each session, after quizzes, render (enrolled users only, matching quiz visibility):
- **Pre-reading** rows — book icon + title; click opens `link` in a new tab (`target="_blank" rel="noopener noreferrer"`).
- **Mini-project** rows — clipboard icon + title; click opens an inline dialog rendering the markdown description.

### 4. `CourseSidebar` + `CourseLearn` (learn workspace)
Add the same two item groups under quizzes for each session:
- **Pre-reading** → opens `link` in a new tab (no sidebar selection state changes).
- **Mini-project** → sets `selected = { kind: 'mini_project', id }`; the right panel renders the title + markdown description block (no video, no chapter progress calls).

Empty groups render nothing. No DB changes.

### Files touched
- `supabase/functions/get-course-curriculum/index.ts`
- `supabase/functions/get-course-learn/index.ts`
- `src/components/course/CourseContentAccordion.tsx`
- `src/components/course/CourseSidebar.tsx`
- `src/pages/CourseLearn.tsx`
