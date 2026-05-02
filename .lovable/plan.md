# Redesign Quiz Responses Admin Tab

## Goal
- **Single Cohort filter** (cohorts + on-demand courses) — remove Session and Quiz filters.
- Show all ungraded MCQ + subjective responses for that cohort, **grouped by Session → Quiz**.
- Within each quiz, render a **pivoted table**: rows = enrolled learners, columns = ungraded/subjective questions, cells = that learner's answer.
- Scope strictly to **enrolled participants** of the selected cohort/course.

## Pivoted layout (per quiz)

```text
Session 1 — Intro to LLMs
  Quiz: Fundamentals
    | Name    | Q1 | Q2 | Q3 |
    | Nikhil  | Answer of Q1 | Answer of Q2 | Option B |
    | Aziz    | —            | Answer of Q2 | Option A |
    | Riya    | (no submission)            |          |

Session 2 — Prompting
  Quiz: Prompt Patterns
    | ...
```

- Columns: only `mcq_ungraded` + `subjective` questions, in question order. Header shows `Q1`, `Q2`… with the full question text in a tooltip / second header line.
- Rows: all enrolled learners; learners who never submitted that quiz show "(no submission)" spanned across the row.
- For `mcq_ungraded`: show the chosen option text. For `subjective`: show the text answer (truncate with hover/expand).
- Sessions sorted by `session_order`. Quizzes/sessions with no ungraded/subjective questions are hidden.

## Backend — extend existing `get-quiz-responses`

Modify `supabase/functions/get-quiz-responses/index.ts` to support a new cohort/course mode (keep existing `quiz_id` mode for backward compatibility).

New mode — when called with `?cohort_id=<uuid>` **or** `?course_id=<uuid>`:
1. Admin auth check (already in place).
2. Load enrolled `user_id`s from `enrollments` for that cohort/course.
3. Load `sessions` for that cohort/course (id, title, session_order).
4. Load `session_quizzes` for those session ids → set of `quiz_id`s.
5. Load `quizzes` (id, title, questions); keep only those with at least one `mcq_ungraded`/`subjective` question.
6. Load `quiz_submissions` filtered by those quiz_ids AND enrolled user_ids; keep latest per (user, quiz).
7. Resolve `profiles.full_name` and `auth.admin.getUserById` emails for the enrolled set (reuse existing helper logic).
8. Return:
   ```ts
   {
     enrolled: Array<{ user_id, name, email }>,
     sessions: Array<{
       id, title, session_order,
       quizzes: Array<{
         id, title,
         questions: Array<{ id, type, question, options? }>, // ungraded only
         submissions: Array<{ user_id, submitted_at, answers }>
       }>
     }>
   }
   ```

Single round-trip from the client.

## Frontend changes (`src/pages/Admin.tsx`)

1. Remove state: `responsesSessionFilter`, `responsesQuizFilter`, `responsesSessionQuizMap`, `responsesQuiz`, `responsesSubmissions`.
2. Add `responsesData` (typed shape above) and keep `responsesLoading`.
3. Replace the 3-filter grid with a single Cohort/Course Select (reuse existing grouped Select).
4. On cohort change: call `get-quiz-responses?cohort_id=…` (or `course_id=…`) once.
5. Render Session → Quiz → pivoted `<Table>` (learners × ungraded questions). Empty answers show `—`; non-submitters show "(no submission)" across the row.
6. Update `downloadResponsesCSV` to flatten the new structure as wide per-quiz blocks: `Session, Quiz, Learner, Email, Q1, Q2, …`.

## Files touched
- `supabase/functions/get-quiz-responses/index.ts` — add cohort/course mode
- `src/pages/Admin.tsx` — Quiz Responses tab body, state, fetch, CSV export

## Out of scope
- No DB migrations, no learner-facing changes.
