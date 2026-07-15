# Learn page fixes

Three targeted fixes to `/courses/:slug/learn`. No backend changes, no edge functions.

## 1. Only the left panel scrolls

Currently the outer grid uses `md:grid-cols-[300px_1fr]` inside a `flex-1 min-h-0` row, but the sidebar itself is `h-full` and the main column has `overflow-y-auto`. On narrower viewports the whole page ends up scrolling.

Changes in `src/pages/CourseLearn.tsx`:
- Wrap the body row so it has a fixed height (`h-[calc(100vh-3.5rem)]`) and `overflow-hidden`.
- Sidebar column: `h-full overflow-y-auto`.
- Main column: `h-full overflow-hidden` — the video + description area sits inside a non-scrolling container. If description overflows, only that inner text block scrolls (`overflow-y-auto`), not the page.

Result: page never scrolls; sidebar scrolls independently; video stays pinned.

## 2. "Next: <session>" card at the bottom of the sidebar list

When the last item of the current session's chapter/quiz list is reached, show a compact "Next" card pointing to the next session (like the reference screenshot).

Changes in `src/components/course/CourseSidebar.tsx`:
- Accept a new prop `nextSession?: { id: string; title: string; session_order: number }` and `onSelectSession` (already present).
- After the chapter/quiz rows, render a card:
  ```
  Next
  Session N+1: <title>  ›
  ```
  Clicking it calls `onSelectSession(nextSession.id)`.
- Card sits above the "Course <pct>%" footer, inside the scrollable list area so it appears at the end of current session content.

In `CourseLearn.tsx`, compute `nextSession` = sessions sorted by order, first one after `currentSession` and pass it in.

## 3. HLS video: not auto-starting, stops after a few seconds

Two root causes in `src/components/video/HlsPlayer.tsx`:

a. `autoPlay` prop is not being passed by `CourseLearn.tsx`, so first chapter never starts. Even when true, browsers block autoplay with sound — we need `muted` on first attempt and explicit `video.play()` after manifest parses.

b. The `onProgress` handler in `CourseLearn.tsx` calls `markChapterComplete` every 15 seconds, which does an `await invokeFn(...)` and, more importantly, updates React state `chapterProgress` on the currently-playing chapter. That state change re-renders `HlsPlayer`, and because the `useEffect` dep list includes `onError` (a new function each render via `toast`), the effect re-runs: it pauses the video, removes `src`, calls `video.load()`, and re-attaches HLS — which is exactly the "stops after a few seconds" symptom.

Changes:
- `HlsPlayer.tsx`:
  - Store `onError`, `onProgress`, `onEnded`, `onNearEnd` in refs so the setup `useEffect` only depends on `src`. Setup runs once per src change, not on every parent re-render.
  - After `Hls.Events.MANIFEST_PARSED` (and after `loadedmetadata` in native path), call `video.play().catch(...)`; if it rejects due to autoplay policy, set `video.muted = true` and retry once.
  - Keep the reset (`pause` / `removeAttribute('src')` / `load()`) only on actual src change.
- `CourseLearn.tsx`:
  - Pass `autoPlay` to `HlsPlayer`.
  - Throttle the progress writer using a ref (last-saved second) instead of reading React state, so `chapterProgress` isn't updated every 15s during playback. Persist completion only on `onNearEnd` and on chapter change/unmount.
  - Memoize `onError`/`onProgress`/`onNearEnd`/`onEnded` with `useCallback` as a belt-and-suspenders measure.

## Technical notes

- No schema, RLS, edge-function, or route changes.
- Files touched: `src/pages/CourseLearn.tsx`, `src/components/course/CourseSidebar.tsx`, `src/components/video/HlsPlayer.tsx`.
- Verification: type-check, then Playwright load of `/courses/ai-mastery-for-working-professionals/learn`, screenshot to confirm no page scroll, sidebar scrolls, "Next" card visible at end of session list, video autoplays (muted) and continues past 15s without reload.
