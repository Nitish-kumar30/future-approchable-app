## Goal

Make the published site (`learn.approachable.dev`) show the new "AI Mastery for Working Professionals" course with paid-course pricing, so you can see the recently merged payment-gateway and course-content changes end-to-end.

## Why the site looks empty today

- The code merged to `main` is already Live.
- Live DB has only 3 courses, all `is_on_demand = true`, so `/courses` (which filters `is_on_demand = false`) correctly shows "No Courses Available".
- Test DB has the AI Mastery course (with pricing, 2 sessions, 24 chapters, 2 session-quiz links). Publishing never copies data — only schema/functions.

## What I'll copy from Test → Live

The AI Mastery course row (`96be8221-...`) plus all its dependent content, preserving IDs so links keep working:

- 1 row in `courses` (including `price_inr_paise=299900`, `price_usd_cents=9900`, `is_on_demand=false`, `is_published=true`)
- 2 rows in `sessions`
- 24 rows in `chapters`
- The 2 quizzes referenced by `session_quizzes` for those sessions (rows in `quizzes` + `session_quizzes`)
- Any `pre_reading_materials` and `mini_projects` linked to those sessions

Not copied (intentional):
- Enrollments, quiz submissions, chapter progress, ratings, payments — all user data stays isolated per environment.

## How

Since project rules require DB writes through edge functions or the migration/insert tools (never client SQL), I will:

1. Read the exact rows from Test with `supabase--read_query` (development).
2. Use the `supabase--insert` tool against **production** to `INSERT ... ON CONFLICT (id) DO UPDATE` each row in dependency order:
   `courses` → `sessions` → `chapters` → `quizzes` → `session_quizzes` → `pre_reading_materials` → `mini_projects`.
3. Verify with a production `SELECT` that the course appears with the right session/chapter counts.

No code changes, no schema changes, no new edge functions.

## After it's done

- `learn.approachable.dev/courses` will show "AI Mastery for Working Professionals".
- The detail page shows the new accordion + Preview modal.
- Enrolling triggers the Razorpay flow using the Live keys currently set in Cloud → Secrets (please confirm they are the **live** Razorpay keys, not test keys, before you take a real payment).

## Confirm before I run

- ✅ Copy AI Mastery only? (Say the word and I'll also include "Building AI Agents with n8n" or "Claude Code Deep Dive" if you want them Live too.)
- ✅ OK to keep prices as ₹2,999 / $99?
- ✅ Razorpay keys in Live Cloud → Secrets are the ones you want charged?
