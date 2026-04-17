

The user wants the "Unenrolled" tab status column to be editable (toggle between `pending` and `approved`), and the change should persist to `cohort_registrations`.

Looking at the schema: `cohort_registrations.status` is text, defaulting to `'pending'`. RLS allows admins to UPDATE. The unenrolled view fetches from this table via the `get-unenrolled-users` edge function.

Per project rules, all DB writes must go through edge functions. I need to confirm with the user before creating one.

## Plan

### 1. New edge function: `update-registration-status`
- Validates JWT and confirms admin role (via `user_roles`)
- Accepts `{ email, cohort, status }` where status ∈ `'pending' | 'approved'`
- Updates the matching row in `cohort_registrations` using service role
- Returns success/error

Why match by `email + cohort`: the unenrolled view doesn't currently track the registration `id`. Alternative: include `id` in the response from `get-unenrolled-users` and match by id (cleaner). I'll go with **id-based matching** — update `get-unenrolled-users` to also return `id`.

### 2. Update `get-unenrolled-users` edge function
- Include the registration `id` in the returned `users` array

### 3. Admin UI changes (`src/pages/Admin.tsx`)
- Replace the static status `Badge` cell in the Unenrolled table with a `Select` dropdown (options: Pending, Approved)
- On change, call `update-registration-status` edge function via `supabase.functions.invoke`
- Optimistically update local state; toast on success/error
- Same treatment can optionally apply to the Registrations tab (out of scope unless requested)

### 4. No schema changes
- `status` column already exists and accepts text. No migration needed.

### Files touched
- NEW: `supabase/functions/update-registration-status/index.ts`
- EDIT: `supabase/functions/get-unenrolled-users/index.ts` (add `id` to response)
- EDIT: `src/pages/Admin.tsx` (replace Badge with Select + handler)

### Confirmation needed
Per your project rule, I'm confirming before creating the new edge function `update-registration-status`. Approve this plan and I'll proceed.

