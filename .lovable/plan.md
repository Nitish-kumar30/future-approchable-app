

# Fix Profile Update for Learners

## The Problem
Learners cannot update their name or bio in their profile. When they click "Save Changes", nothing happens because the current database security policy is incomplete - it's missing a validation clause that's required for updates to work properly.

## The Solution
Create a backend function that securely handles profile updates, bypassing the current policy limitation. This follows the same proven pattern already used in your admin features (enrollments, leaderboard).

## What Will Change

### 1. New Backend Function: `update-profile`
A secure function that:
- Verifies the user is logged in
- Ensures users can only update their own profile
- Uses elevated privileges to perform the update
- Returns success/error status

### 2. Updated Profile Page
Modify the save functionality to call the new backend function instead of updating the database directly.

## Technical Details

### New File: `supabase/functions/update-profile/index.ts`

The function will:
```text
1. Handle CORS preflight requests
2. Verify JWT token to authenticate the user
3. Extract user ID from the token
4. Accept full_name and bio from the request body
5. Use service role to update the profiles table
6. Only update the row matching the authenticated user's ID
7. Return success or error response
```

### Updated File: `src/pages/Profile.tsx`

Change the `handleSave` function to:
```text
1. Call the update-profile edge function with fetch
2. Pass full_name and bio in the request body
3. Include the user's auth token in the header
4. Handle success/error responses
5. Show appropriate toast notifications
```

### Config Update: `supabase/config.toml`

Add the new function entry alongside existing functions.

## Security
- Users must be authenticated (valid JWT required)
- Users can only update their own profile (user ID comes from token, not from user input)
- Service role key is only used server-side, never exposed to the browser

## Files to Create/Modify
1. `supabase/functions/update-profile/index.ts` - New backend function
2. `supabase/config.toml` - Register the new function
3. `src/pages/Profile.tsx` - Use the new function for saving

