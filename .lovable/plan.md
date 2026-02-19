
# Add Enrollment Confetti in CohortDetail

## What's changing

A small confetti burst fires the moment a user successfully enrolls in a cohort. No tracking, no persistence — it fires once per enrollment click and that's it.

## Technical approach

Install `canvas-confetti` (a tiny, zero-dependency library specifically for this) and call it right after the successful enrollment in `handleEnroll`.

### Package
- Add `canvas-confetti` + its types (`@types/canvas-confetti`) to `package.json`.

### `src/pages/CohortDetail.tsx`
- Import `confetti` from `canvas-confetti`.
- After `setIsEnrolled(true)` in the `handleEnroll` success block, fire a short confetti burst:

```ts
confetti({
  particleCount: 120,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'],
});
```

The colors are pulled from the app's existing indigo/violet palette to feel native. `origin: { y: 0.6 }` fires it from slightly below center — looks natural on a page with a header.

## Files changed

| File | Change |
|---|---|
| `package.json` | Add `canvas-confetti` + `@types/canvas-confetti` |
| `src/pages/CohortDetail.tsx` | Import `confetti`, call it on successful enrollment |

That's it — two files, minimal footprint.
