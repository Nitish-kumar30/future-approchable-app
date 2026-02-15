

# Fix Navigation Bar on /on-demand Page for Logged-In Users

## Problem
The `/on-demand` page always uses `PublicHeader`, which only shows a minimal nav with a "Dashboard" link. Logged-in users should see the full navigation bar (Dashboard, Cohorts, Live Courses, On-Demand, Admin, etc.).

## Solution
Update `src/pages/OnDemandCourses.tsx` to conditionally render:
- **Logged-in users**: Wrap content in `MainLayout` (full nav bar with all links)
- **Not logged in**: Keep using `PublicHeader` with the simple footer

## Changes

### `src/pages/OnDemandCourses.tsx`
- Import `MainLayout` and `useAuth`
- Check `user` from `useAuth()`
- If logged in, wrap the content in `MainLayout`
- If not logged in, keep the current `PublicHeader` + footer layout

This is a small, targeted fix -- just conditional layout wrapping based on auth state.

