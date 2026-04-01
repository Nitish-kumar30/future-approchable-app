

## Add Mid-Course Nudge Cards and Quiz Result Upsell

### What
Two contextual upsell placements within the on-demand course experience:
1. **Mid-course nudge card** — After completing session 2 or 3, show an inline card in the content area encouraging users to consider the live cohort.
2. **Quiz result upsell** — After submitting a quiz, show a cohort CTA below the score, tailored to whether they scored well or not.

### Implementation

**New file: `src/components/session/CohortUpsellCard.tsx`**
- Reusable card component with indigo/purple gradient border
- Props: `variant: 'mid-course' | 'quiz-high' | 'quiz-low'`
- Content varies by variant:
  - `mid-course`: "Enjoying this course? Go deeper with live mentorship" + cohort details + CTA
  - `quiz-high`: "Great score! Imagine what you could achieve with live guidance" + CTA
  - `quiz-low`: "Want personalized help? Join a live cohort for hands-on mentorship" + CTA
- All variants show: Apr 23, 2026 date, pricing (₹2,999 / $99), social proof line ("Our Mar 19 cohort filled all 20 seats · Alumni from Adobe, Microsoft, Deloitte"), and "Reserve Your Seat →" button linking to the same Google Form URL as `PromoBanner`

**Modified: `src/pages/OnDemandCourseDetail.tsx`**
- After the active session content block (~line 555), check if the user has completed exactly 2 or 3 trackable sessions total AND the current session was just completed — render `<CohortUpsellCard variant="mid-course" />` below the session content
- Logic: show nudge when `completedSessionIds.size >= 2 && completedSessionIds.size <= 3 && completedSessionIds.has(activeSession.id)` and `completionPercent < 100`

**Modified: `src/components/session/InlineQuiz.tsx`**
- In the results view (line 132-150), after the score card, render `<CohortUpsellCard variant={latestScore >= 70 ? 'quiz-high' : 'quiz-low'} />` below it
- Only show on first submission (not on retakes) — track with a `showUpsell` state set to `true` on first submit, reset on retake

### Behavior
- Mid-course nudge appears inline below session content, non-blocking
- Quiz upsell appears below quiz results, dismissible by scrolling past
- Neither blocks the user from continuing — purely informational
- Uses the same form URL constant as `PromoBanner` (extract to a shared constant)

### Shared constant
- Create `src/lib/constants.ts` with `export const COHORT_FORM_URL = '...'` and refactor `PromoBanner` to import from there

