# Make Subjective Questions Optional

## Goal
Allow users to submit a quiz without filling in subjective question textareas. Subjective answers become optional; MCQ (graded) and MCQ-ungraded remain required.

## Changes

### 1. Database — `submit_quiz_answers` RPC (migration)
Update the function so subjective questions skip the "missing answer" and "empty string" errors:
- If `v_type = 'subjective'`: if the answer key is missing OR is null OR is an empty string, accept it and store it as `null`/`""` (skip validation, do not raise). Keep the 1000-char max validation when text is provided.
- MCQ and `mcq_ungraded` validation stays unchanged (still required).

### 2. Frontend — `src/pages/Quiz.tsx`
- `handleSubmit`'s `unanswered` filter: exclude `subjective` type entirely (only count MCQ/ungraded as required).
- When building the `answers` payload, ensure subjective questions always have a key (send empty string if untouched) so the RPC payload is consistent.
- Subjective question card: show "(Optional)" badge next to "Not graded" so users know they can skip it.

### 3. Frontend — `src/components/session/InlineQuiz.tsx`
- Same two changes: drop subjective from required-answer check and add the "(Optional)" badge.

### 4. Results view — `src/components/session/QuizResponseList.tsx`
Already handles missing answers via the "No response" branch — no change needed.

## Files Modified
- New migration for `public.submit_quiz_answers`
- `src/pages/Quiz.tsx`
- `src/components/session/InlineQuiz.tsx`

## Out of Scope
- No changes to the admin Quiz Responses tab (it already shows "(no submission)" for missing answers and will simply show empty strings the same way).
- No changes to question authoring UI (subjective remains a question type; it's the user's response that becomes optional).
