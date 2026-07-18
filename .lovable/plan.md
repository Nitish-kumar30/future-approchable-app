## Goal
Add a "Duplicate" action for quizzes in the Admin → Quizzes tab so admins can clone a quiz's definition (title + questions) without copying any submissions/responses.

## Scope
- Only clones the row in `quizzes` (title, questions JSON).
- Does NOT copy `quiz_submissions`.
- Does NOT copy `session_quizzes` mappings — the duplicate starts unattached, so admins can assign it to sessions as needed.
- New quiz title = `"<original title> (Copy)"`.

## UX
- In `src/pages/Admin.tsx` Quizzes list, add a "Duplicate" button next to Edit/Delete on each quiz row.
- On click → confirm → call edge function → toast success → refresh list.
- The duplicated quiz appears in the list, ready to edit or attach to sessions.

## Backend (per project rule: DB writes go through edge functions)
New edge function `supabase/functions/duplicate-quiz/index.ts`:
- Auth: verify caller JWT, require `admin` role via `user_roles`.
- Input: `{ quiz_id: string }` (validated).
- Reads original quiz via service role, inserts a new row with the same `questions` and title suffixed `(Copy)`.
- Returns the new `{ id, title }`.

## Technical Details
- Files:
  - New: `supabase/functions/duplicate-quiz/index.ts`
  - Edit: `src/pages/Admin.tsx` (add button + handler in the Quizzes tab)
- No schema/migration changes; no new tables; existing `quizzes` grants and RLS remain unchanged.
- Session mappings and prior submissions are intentionally untouched.
