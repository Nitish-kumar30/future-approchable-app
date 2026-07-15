## Overview

Rename "Live Courses" → "Courses". Add optional **Chapters** under each Session (sessions may have 0 chapters). Chapters host Gumlet **HLS** video (public URLs like `https://video.gumlet.io/<collection>/<video>/main.m3u8`). Build a two-pane learning player, admin-controlled per-chapter previews, course ratings (0.5-step, 1–5) and personal + anonymous community progress. All chapter/session descriptions render as Markdown.

## UI rename
- Nav label + heading in `src/pages/LiveCourses.tsx` and `src/components/layout/PublicHeader.tsx`: "Live Courses" → "Courses". Route `/courses` unchanged.

## Data model

**New `chapters`**: `session_id`, `title`, `description` (markdown), `hls_url`, `thumbnail_url`, `duration_seconds`, `chapter_order`, `is_preview` (default false), `is_content_unlocked` (default true).

**New `chapter_progress`**: `user_id`, `chapter_id`, `is_completed`, `watched_seconds`, `completed_at`, unique(user_id, chapter_id).

**New `course_ratings`**: `user_id`, `course_id`, `rating` numeric(2,1) CHECK (0.5–5, half-steps), optional `comment`, unique(user_id, course_id).

Full GRANTs + RLS on all three (owner writes; SELECT scoped to enrolled/admin; community aggregates via SECURITY DEFINER function).

**Session completion trigger** extended: session is complete when all its chapters (if any) are completed AND all its quizzes (if any) are submitted. Sessions with no chapters or quizzes keep current manual completion path.

## Video playback (Gumlet HLS)

- New `HlsPlayer` using `hls.js` with native Safari fallback (`canPlayType('application/vnd.apple.mpegurl')`).
- Public URLs — no signing edge function needed.
- Completion trigger: mark chapter complete at ≥95% watched or via manual "Mark complete" button.

## Markdown

- Chapter and session description fields render via existing `Markdown` component in both admin previews and learner views.

## Admin

Extend `SessionForm` / Admin course view with a nested Chapters editor:
- Add / edit / delete / reorder chapters.
- Fields: title, Markdown description, HLS URL, thumbnail, duration, `is_preview`, `is_content_unlocked`.
- If a session has chapters, its session-level `recording_url` becomes optional (label: "Optional overview video").

## Preview access (logged-in, not enrolled)

- Course detail page shows sessions; expanding a session lists its chapters.
- Chapters with `is_preview = true` → playable for any logged-in user via `HlsPlayer`.
- Non-preview chapters → lock icon + "Enroll to unlock".
- Sessions without chapters retain today's behavior.

## Learning player (enrolled users)

New route `/courses/:slug/learn` → `src/pages/CourseLearn.tsx`:
- Two-pane shadcn `Sidebar` (collapsible).
- Left: accordion of Sessions → ordered Chapters + Quizzes. Progress icons + Preview badge.
- Right: `HlsPlayer` + Markdown description + prev/next + "Mark complete".
- Chapter id in URL (`?chapter=<id>`) for refresh/share.
- Inline quizzes via existing `InlineQuiz`.

## Course completion + rating

- Sidebar header: % complete = completed chapters / total chapters (sessions with no chapters count once, tied to session completion).
- At 100%: completion banner + rating widget (0.5-step, 1–5, optional Markdown comment) → upserts `course_ratings`.
- Course cards show average rating + count.

## Progress page

New `src/pages/CourseProgress.tsx` linked from the learn view:
- **My progress**: chapters/sessions completed vs total, quiz average.
- **Community progress** (anonymous SECURITY DEFINER RPC):
  - Per-session completion %.
  - Overall completion distribution (0–25 / 25–50 / 50–75 / 75–100%).
  - Average course completion %.
  - No user names/ids exposed.

## Edge functions (approved to create)

1. `get-course-learn` — course + sessions + chapters + quizzes + caller's progress; respects preview vs enrolled.
2. `update-chapter-progress` — upsert `chapter_progress`, recompute session completion.
3. `submit-course-rating` — upsert `course_ratings`.
4. `get-course-community-progress` — anonymous aggregates.
5. Update `get-public-sessions` to include chapter titles + `is_preview` for previews.
6. Update `CourseDetail` fetch path (currently direct DB reads) to go through edge functions per project rule.

## Rollout notes

- Migration is additive; existing sessions/courses keep working immediately.
- Chapters are optional per session; UI adapts based on presence.
- Rename ships in the same batch as chapter data model so nav copy and new player land together.
