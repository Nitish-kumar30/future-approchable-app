# Admin: Payments filters/export + inline registration approval

## 1. Payments tab

Today the Payments tab lists course purchases only. Cohort registration fees are recorded separately on the registrations records, so they never show up here.

Changes:
- Backend (`get-payments`) returns a single merged list:
  - Course payments (existing source), tagged `type: "course"` with the course name.
  - Cohort registration payments (registration records that have a Razorpay order), tagged `type: "cohort"` with the cohort label, registrant name, email, amount, currency, status.
  - Also returns the distinct course list and cohort list for the dropdowns.
- UI adds two dropdowns in the Payments header: **Course** (All + each course) and **Cohort** (All + each cohort label). Selecting a course filters to course payments for it; selecting a cohort filters to registration payments for it; "All" on both shows everything.
- Adds a **Download CSV** button that exports exactly the currently filtered rows: Type, Name, Email, Course/Cohort, Amount, Currency, Status, Order ID, Payment ID, Date.
- Table gains a Type column (Course / Cohort) and the existing Course column becomes "Course / Cohort".

## 2. Registrations tab — inline approve dropdown

- Add a Status dropdown (Pending / Approved) directly on each registration's collapsed header row, matching the Unenrolled tab control.
- Clicking the dropdown does not expand/collapse the accordion.
- It calls the existing `update-registration-status` function with optimistic update and revert on failure; the static status badge on the row is replaced by this dropdown.

## Technical notes

- Files: `supabase/functions/get-payments/index.ts`, `src/pages/Admin.tsx`.
- No schema changes and no new edge functions — `get-payments` is extended and `update-registration-status` is reused.
- Filtering and CSV are client-side over the merged payload; dropdown options come from the same response.
