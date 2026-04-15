

## Plan: Unenrolled Users Tab in Admin Panel

### Problem
Admins have no way to identify users who signed up but aren't enrolled in any cohort, making targeted outreach impossible.

### Solution
Add a new "Unenrolled Users" tab in the Admin panel that lists users with accounts but no cohort enrollment, showing their name, email, and signup date. This requires a new edge function since user emails live in `auth.users` (not accessible from the client).

### Changes

**1. Create edge function `supabase/functions/get-unenrolled-users/index.ts`**
- Admin-only (verify JWT + check `user_roles` for admin)
- Query all users from `auth.users` whose IDs do NOT appear in `enrollments` where `cohort_id IS NOT NULL`
- Join with `profiles` for full names
- Return: `user_id`, `email`, `full_name`, `created_at` (signup date)
- Support optional filter: exclude users enrolled in a specific cohort vs any cohort

**2. Update `supabase/config.toml`**
- Add `[functions.get-unenrolled-users]` with `verify_jwt = false`

**3. Update `src/pages/Admin.tsx`**
- Add a new "Unenrolled" tab (9th tab) with a `UserMinus` icon
- Add state for unenrolled users list and loading
- Call the edge function on tab activation
- Display a table with columns: Name, Email, Signed Up (formatted date)
- Add a "Copy Emails" button that copies all emails to clipboard for easy outreach
- Add a "Download CSV" button for bulk export

### Technical Notes
- The edge function uses the service role key to access `auth.users` for emails (consistent with existing `get-enrollments` pattern)
- Grid cols in TabsList will change from 8 to 9

