# Admin: Payments filters/export + inline registration approval

## 1. Payments tab

Today the Payments tab lists course purchases only. Cohort registration fees are recorded separately on the registrations records, so they never show up here.

Changes:
- Backend (`get-payments`) requires exactly one selector: `course_id` or `cohort` (label). There is no "All" — without a selector it returns only the dropdown option lists (courses and cohort labels) and an empty payment list, so nothing loads a full table server-side.
  - With `course_id`: course purchase records for that course, tagged `type: "course"`.
  - With `cohort`: registration payment records for that cohort label (registrations carrying a Razorpay order), tagged `type: "cohort"`, with registrant name, email, amount, currency, status.
- UI shows two dropdowns in the Payments header: **Course** and **Cohort**, mutually exclusive (picking one clears the other) and no "All" entry. Until one is picked, the table shows an empty state prompting a selection. Each change refetches from the server.
- Adds a **Download CSV** button, enabled once a selection is loaded, exporting the loaded rows: Type, Name, Email, Course/Cohort, Amount, Currency, Status, Order ID, Payment ID, Date.
- Table gains a Type column (Course / Cohort) and the existing Course column becomes "Course / Cohort".


## 2. Registrations tab — inline approve dropdown

- Add a Status dropdown (Pending / Approved) directly on each registration's collapsed header row, matching the Unenrolled tab control.
- Clicking the dropdown does not expand/collapse the accordion.
- It calls the existing `update-registration-status` function with optimistic update and revert on failure; the static status badge on the row is replaced by this dropdown.

## Technical notes

- Files: `supabase/functions/get-payments/index.ts`, `src/pages/Admin.tsx`.
- No schema changes and no new edge functions — `get-payments` is extended and `update-registration-status` is reused.
- Filtering and CSV are client-side over the merged payload; dropdown options come from the same response.
