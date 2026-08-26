Refine the CohortDetail About tab to make the progress bar minimal and avoid a full standalone row for the certificate section.

Scope
- File: `src/pages/CohortDetail.tsx`
- Only change the enrolled-only top section inside the About tab (progress card + certificate card order/compactness).
- Do not touch Sessions, Mentor, Leaderboard tab content, or the outer page shell compacted in the previous change.

Changes
1. Minimal progress bar (match the screenshot style):
   - Convert the existing progress `Card` into a compact, single-row bar.
   - Left side: bold "Your Progress" label + "X / Y sessions completed" helper text.
   - Center: a thin `Progress` bar.
   - Right side: the percentage.
   - Remove the CardHeader/CardTitle and the separate "Complete your cohort" helper line.
2. Remove the certificate section's own full-width row:
   - Move `CertificatePanel` immediately below the compact progress bar, still as a card but without a large header gap.
   - Alternatively, collapse the certificate card into a compact inline row if only simple actions are needed (e.g. a single "Request Certificate" or download link). Keep the existing dialog-driven request flow intact.
3. Preserve existing behavior:
   - Progress still derives from `completedSessions / sessions.length`.
   - `CertificatePanel` still receives `cohortId` and `programName`.
   - Feedback button remains in the enrolled header action area.

Out of scope
- No changes to the progress calculation logic.
- No changes to certificate eligibility, request, download, or regenerate logic.
- No changes to the Sessions, Mentor, or Leaderboard tabs.

Verification
- TypeScript check and local preview of an enrolled cohort to confirm the progress bar is a single row and the certificate section no longer sits in a separate full-height card row.
