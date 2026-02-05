

# Add Enrollments Tab to Admin Panel with Mandatory Filter

## Overview
Add a new "Enrollments" tab to the Admin Panel that displays enrolled students with their names and emails. The filter is mandatory - no enrollments are fetched or displayed until the admin selects a specific cohort or course.

## Implementation Steps

### 1. Create Edge Function: `get-enrollments`

Create a new edge function at `supabase/functions/get-enrollments/index.ts` that:
- Authenticates the request and verifies the caller is an admin
- Requires either `cohort_id` or `course_id` as a query parameter (mandatory filter)
- Returns 400 Bad Request if neither is provided
- Uses the service role key to access `auth.users` to get emails
- Joins with profiles to get full names
- Returns filtered enrollment data with user details

**Request format:**
```text
GET /get-enrollments?cohort_id={id}
OR
GET /get-enrollments?course_id={id}
```

**Response format:**
```text
{
  enrollments: [
    {
      id: string,
      user_id: string,
      cohort_id: string | null,
      course_id: string | null,
      enrolled_at: string,
      user_email: string,
      user_name: string | null
    }
  ]
}
```

### 2. Update supabase/config.toml

Add configuration for the new edge function with `verify_jwt = false` (authentication handled in code).

### 3. Update Admin.tsx

**Add new state variables:**
- `enrollments` - array to store fetched enrollment data (initially empty)
- `enrollmentFilter` - filter state, defaults to empty string `""` (no selection)
- `enrollmentsLoading` - loading state for enrollments fetch

**Add new interface:**
```text
interface EnrollmentWithUser {
  id: string
  user_id: string
  cohort_id: string | null
  course_id: string | null
  enrolled_at: string
  user_email: string
  user_name: string | null
}
```

**Add fetch function:**
- Only call the edge function when a filter is selected (not empty)
- Parse the filter value to extract cohort_id or course_id
- Pass the appropriate query parameter to the edge function
- Handle loading and error states

**Update TabsList:**
- Add 5th tab "Enrollments" with Users icon
- Update grid from `grid-cols-4` to `grid-cols-5`

**Add TabsContent for enrollments:**
- Filter dropdown WITHOUT "All" option - only cohorts and courses
- Placeholder prompt when no filter selected: "Select a cohort or course to view enrollments"
- Table with columns: Student Name, Email, Enrolled At
- Show enrollment count in header when data is loaded

### 4. UI Layout

**Initial state (no filter selected):**
```text
+------------------------------------------------------------------+
| Enrollments Tab                                                   |
+------------------------------------------------------------------+
| [View Enrollments]               [Filter: Select cohort/course ▼] |
| View student enrollments                                          |
+------------------------------------------------------------------+
|                                                                   |
|     Select a cohort or course to view enrollments                 |
|                                                                   |
+------------------------------------------------------------------+
```

**After filter selection:**
```text
+------------------------------------------------------------------+
| Enrollments Tab                                                   |
+------------------------------------------------------------------+
| [View Enrollments (5)]                   [Filter: Cohort 1     ▼] |
| View student enrollments                                          |
+------------------------------------------------------------------+
| Name          | Email              | Enrolled At                  |
|---------------|--------------------|-----------------------------|
| John Doe      | john@email.com     | Feb 5, 2026                 |
| Jane Smith    | jane@email.com     | Feb 4, 2026                 |
+------------------------------------------------------------------+
```

## Technical Details

### Edge Function Logic

```text
1. Handle CORS preflight (OPTIONS request)
2. Extract JWT from Authorization header
3. Create authenticated Supabase client
4. Verify user is authenticated via getUser()
5. Check if user has admin role (query user_roles table)
6. If not admin, return 403 Forbidden
7. Parse query params - require either cohort_id or course_id
8. If neither provided, return 400 Bad Request with message
9. Fetch enrollments filtered by cohort_id or course_id
10. Get all unique user_ids from enrollments
11. For each user_id:
    - Fetch profile for full_name
    - Use auth.admin.getUserById() for email
12. Return combined data array
```

### Filter Logic (different from sessions tab)
- No `"all"` option - filter is mandatory
- `""` (empty) - initial state, shows prompt to select filter
- `"cohort:{id}"` - filters by specific cohort
- `"course:{id}"` - filters by specific course

### Fetch trigger
- `useEffect` watches `enrollmentFilter` state
- Only calls fetch function when filter is non-empty
- Clears enrollments array when filter changes before fetching new data

### Files to Create/Modify
1. `supabase/functions/get-enrollments/index.ts` - New edge function
2. `supabase/config.toml` - Add function configuration
3. `src/pages/Admin.tsx` - Add Enrollments tab UI and logic

## Security Considerations
- Edge function requires valid JWT token
- Admin role is verified server-side before returning any data
- Service role key is only used server-side, never exposed to client
- Filter is mandatory - cannot fetch all enrollments at once
- RLS policies remain intact for direct table access

