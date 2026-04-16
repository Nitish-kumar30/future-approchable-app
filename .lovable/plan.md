

## Plan: Switch Unenrolled Tab to Registration Table Data

### Problem
The current "Unenrolled" tab pulls from `auth.users` and filters out enrolled users. The admin wants it to show registrations from the `cohort_registrations` table instead, which also contains WhatsApp phone numbers for outreach.

### Changes

**1. Rewrite edge function `supabase/functions/get-unenrolled-users/index.ts`**
- Instead of listing `auth.users`, query `cohort_registrations` table
- Cross-reference with `enrollments` (by email match against `auth.users`) to find registrations where the user is NOT enrolled in any cohort
- Return: `name`, `email`, `whatsapp_number`, `cohort` (registered cohort), `created_at`, `status`
- Keep admin-only auth check

**2. Update `src/pages/Admin.tsx`**
- Update the unenrolled users type to include `whatsapp_number` and `cohort` fields
- Add a "Phone" column to the table
- Update CSV download to include phone numbers
- Add a "Copy Phone Numbers" button alongside "Copy Emails"
- Update description text to reflect registration-based data

### Technical Notes
- The `cohort_registrations` table has: `name`, `email`, `whatsapp_number`, `cohort`, `status`, `created_at`
- No schema changes needed — all data already exists in the registrations table
- The edge function uses service role to bypass RLS (consistent with existing pattern)

