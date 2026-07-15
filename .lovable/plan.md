## Goal
Rework `/courses/:slug/learn` into a focused, DeepLearning.AI-style workspace: minimal top bar with clear back navigation, sticky session-scoped left rail, large working HLS video on the right, and a slim course-progress footer under the sidebar.

## Layout

```text
┌────────────────────────────────────────────────────────────────┐
│ ← Back    Course name  ›  Session N ▾     [◀ ▶]   ★ Rate       │  top bar
├──────────────┬─────────────────────────────────────────────────┤
│ Session N:   │                                                 │
│ Title        │              VIDEO PLAYER (16:9)                │
│              │                                                 │
│ ▶ Chapter 1  │─────────────────────────────────────────────────│
│ ✓ Chapter 2  │  Chapter title                                  │
│ 🔒 Chapter 3 │  Markdown description                           │
│ ❓ Quiz       │                                                 │
├──────────────┤                                                 │
│ Course ▓▓░ 67%│                                                │
└──────────────┴─────────────────────────────────────────────────┘
```

## Changes

### `src/pages/CourseLearn.tsx` (rewrite structure)
- Render **outside** `MainLayout` so the page owns the viewport.
- Minimal top bar:
  - **Back button** on the left: navigates to `/courses/:slug` (course detail). A second link/icon goes to `/courses` (all courses). Both always visible so the user can always exit the player.
  - Middle: course name → current session breadcrumb (session name is a dropdown to jump between sessions).
  - Right: Prev/Next chapter arrows and a "Rate course" button (opens a dialog).
- Two-column body (fills viewport minus top bar):
  - **Left rail** (~300px, own scroll): header "Session N: Title", then the current session's chapters and quizzes. Row icon: check (done), play (active), circle (todo), lock (not watchable). Sub-label shows `Video · Xm` when duration is known, else just "Video". A slim "Switch session" collapsible above the list to jump to another session.
  - **Sticky footer** in the rail: `Course` progress bar + `%`.
  - **Right pane**: 16:9 video area, then chapter title and markdown description below.
- Auto-select next unwatched chapter on load; on `onEnded` advance to next chapter.
- Remove the current top progress card and inline rating card (rating moves to dialog).

### Fix HLS playback in `src/components/video/HlsPlayer.tsx`
The current player breaks when the `src` prop changes across chapters because `hls.js` isn't fully torn down and the media element isn't reset. Fix:
- Reset the `<video>` element between sources: `video.pause(); video.removeAttribute('src'); video.load();` before attaching a new source.
- Always prefer `hls.js` when supported and only fall back to native HLS if `Hls.isSupported()` is false (Safari path). Current order can attach native HLS on Chrome-based browsers that report they can play `application/vnd.apple.mpegurl` but don't actually stream Gumlet reliably.
- Add `Hls` error handling: on `Hls.Events.ERROR` with fatal network/media errors, call `hls.recoverMediaError()` / `hls.startLoad()` as appropriate, and surface a toast on unrecoverable errors.
- Ensure the effect cleanup runs on `src` change (destroy old `Hls` instance before creating a new one — currently the cleanup only runs on unmount because the dep tracking is fine, but the video element carries state; explicit reset above solves it).
- Add `crossOrigin="anonymous"` to the `<video>` so subtitle/quality metadata from Gumlet loads cleanly.
- Keep the existing `onProgress` / `onNearEnd` / `onEnded` API — used by `CourseLearn` for progress tracking and auto-advance.

If Gumlet still fails after the above, the likely cause is a signed URL or referrer policy — I'll add a fallback that opens the Gumlet URL in an `<iframe>` player (`https://play.gumlet.io/embed/<assetId>`) derived from the m3u8 asset id and log the underlying `hls.js` error so we can pin it down.

### New small components
- `src/components/course/CourseSidebar.tsx` — session-scoped list, extracted from `CourseLearn`.
- `src/components/course/RateCourseDialog.tsx` — wraps `StarRating` + textarea + submit, opened from the top bar.

## Out of scope
- No backend/edge-function changes.
- No certificate / assignments concept — skipped as requested.
- No changes to admin chapter management or the quiz flow.
- Community-progress widget is dropped from this view for focus.

## Technical notes
- Files touched: `src/pages/CourseLearn.tsx`, `src/components/video/HlsPlayer.tsx`, plus two new small components under `src/components/course/`.
- No new deps (`hls.js` already installed).
- Existing route `/courses/:slug/learn` unchanged; enrollment/preview gating from `get-course-learn` is respected.
