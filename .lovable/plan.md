# Fix: approved + paid learners are sent back to the registration form on Enroll

## What's actually happening

Clicking **Enroll** on a cohort calls the `check-registration-status` backend function. It answers `approved: false`, so the page shows the payment/registration gate instead of enrolling.

The check fails on a whitespace mismatch, confirmed against live data:

- Cohort record name: `" cohort  6 "` (leading/trailing spaces, **two** spaces in the middle)
- Approved registration's cohort field: `"Cohort 6"` (single space)

The function extracts a `Cohort \d+` token from the cohort name — here it extracts `cohort  6` (two spaces) — and then does a "contains" match against the registration text. `"Cohort 6"` does not contain `cohort  6`, so no approved registration is found and the learner is bounced back to the form.

So it is not a payment or approval problem; the two strings simply never line up when spacing differs.

## The fix

1. **Whitespace-insensitive matching** in `check-registration-status`: collapse runs of whitespace and trim on *both* the cohort name and the registration's cohort text before comparing, then match case-insensitively on the `Cohort N` token (falling back to the full normalized name). Matching moves to a fetch-approved-registrations-for-this-email + compare-normalized-in-code step so normalization is applied to both sides.
2. **Distinguish errors from rejections** (existing BUG-08 note in `CohortDetail.tsx`): if the function call itself fails (network/500), show a retry toast rather than the payment gate. Only a genuine `approved: false` should show the gate.

## Technical notes

- Files: `supabase/functions/check-registration-status/index.ts` (matching logic), `src/pages/CohortDetail.tsx` (`handleEnroll` error branch).
- No schema change, no new function, no data edits. Existing messy cohort names keep working because normalization happens at read time.
- Verification: call the function as the affected learner for cohort `cohort 6` and confirm it returns `approved: true`, then confirm Enroll succeeds.

## Optional follow-up (not included unless you want it)

Trim/collapse whitespace on cohort names when saved in the admin cohort form, so new records don't carry stray spaces.
