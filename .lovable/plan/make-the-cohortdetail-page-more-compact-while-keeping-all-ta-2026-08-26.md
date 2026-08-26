Make the CohortDetail page more compact while keeping all tab content unchanged and keeping the feedback button visible only for enrolled users.

Scope
- File: `src/pages/CohortDetail.tsx`
- Only modify the outer page shell (back button, header, meta row, separator, tabs strip) and the enrolled action area.
- Do not change markup, cards, tables, or logic inside `TabsContent value="about"`, `"sessions"`, `"mentor"`, or `"leaderboard"`.

Changes
1. Tighten the page wrapper from `space-y-8` to `space-y-5`.
2. Compact the header block:
   - Reduce title from `text-3xl` to `text-2xl`.
   - Reduce mentor line from `text-lg` to `text-base`.
   - Reduce header internal `space-y-4` / `space-y-2` to `space-y-3` / `space-y-1`.
   - Keep the enrolled action area in the top-right, but make badges and the Feedback button smaller (e.g. `text-sm px-3 py-1`, `size="sm"`) so the header row stays compact.
3. Compact the meta row:
   - Reduce font size to `text-xs`/`text-sm` and gap from `gap-4` to `gap-3`.
4. Compact the tabs strip:
   - Reduce outer `h-11` / `p-1.5` on `TabsList` to `h-9` / `p-1`.
   - Reduce tab trigger padding and height slightly.
5. Ensure the Feedback button remains in the enrolled header action area (it already exists there; preserve it).
6. Keep `FeedbackDialog` wired to `cohortId={cohort.id}` and `entityName={cohort.name}`.

Out of scope
- No changes to content, cards, tables, or behavior inside About, Sessions, Mentor, or Leaderboard tabs.
- No backend or edge-function changes.

Verification
- Run TypeScript check and a quick local preview of `/cohorts/:id` to confirm the page renders compactly and all four tabs still display as before.
