

## Gate Cohort Enrollment Behind Registration Approval

### Approach
Before enrolling, call a new edge function `check-registration-status` that checks if the user's email has an approved `cohort_registrations` record. The cohort name in registrations is free text (e.g. "Cohort 5 - April 23rd - 7:30PM IST/10AM US Eastern") while the cohort table has names like "Cohort 5 - AI Fundamentals - Apr 23, 2026", so we do a partial match on the cohort number prefix (e.g. "Cohort 5"). Admins always bypass the gate.

### File Changes

**1. New edge function: `supabase/functions/check-registration-status/index.ts`**
- Accepts `cohort_id` in the request body
- Validates JWT, gets user email from `auth.getUser()`
- Fetches the cohort name from `cohorts` table using service role
- Extracts the cohort number prefix (e.g. "Cohort 5") from the cohort name
- Checks `cohort_registrations` for a record where `email` matches the user's email, `status = 'approved'`, and `cohort` starts with the same prefix (using `ilike`)
- Also checks if user has admin role — if admin, returns `{ approved: true }` immediately
- Returns `{ approved: true/false }`

**2. Modify `src/pages/CohortDetail.tsx`**
- Import `Dialog` components
- Add state: `showPaymentGateDialog` (boolean)
- In `handleEnroll`: after the `!user` check, call `check-registration-status` edge function. If not approved, show dialog and return early. If approved (or admin), proceed with enrollment insert as before
- The loader spinner on the enroll button already exists — it will naturally show during the registration check + enrollment insert
- Add a Dialog with:
  - Title: "Enrollment Requires Payment"
  - Message: "Your enrollment is subject to the commitment fee. If you've already paid, please allow 24-48 hours for your registration to be approved."
  - "Register Now" button linking to `/registration`
  - "Close" button

**3. `supabase/config.toml`** — Add function config:
```toml
[functions.check-registration-status]
verify_jwt = false
```

### Partial Match Logic
```
cohort.name = "Cohort 5 - AI Fundamentals - Apr 23, 2026"
→ extract prefix: "Cohort 5"
→ query: WHERE email = user_email AND status = 'approved' AND cohort ILIKE 'Cohort 5%'
```

This handles the mismatch between the registration form's cohort text and the database cohort name.

