

# On-Demand Mini Courses -- Simplified Admin with Flag + Filter

## Overview
Add `is_on_demand` to the courses table. In the Admin Courses tab, show a badge indicating on-demand vs live, and add a filter dropdown. No separate tab needed.

## Database Change

Add one column:
```sql
ALTER TABLE courses ADD COLUMN is_on_demand boolean NOT NULL DEFAULT false;
```

## Admin Changes (Courses Tab in `src/pages/Admin.tsx`)

1. Add a filter dropdown (like sessions already have) at the top of the Courses tab: "All Courses" / "Live Courses" / "On-Demand Courses"
2. Add a new column in the courses table showing an "On-Demand" or "Live" badge next to the status badge
3. Filter the displayed courses list based on the selected filter
4. Update the `Course` interface to include `is_on_demand: boolean`
5. Update `handleSaveCourse` to persist the `is_on_demand` field

## CourseForm Change (`src/components/admin/CourseForm.tsx`)

1. Add `is_on_demand` to the `Course` interface and `defaultCourse`
2. Add a Switch toggle: "On-demand course (no enrollment required, content gated by login)"
3. When `is_on_demand` is true, hide the "Disable enrollment" toggle (not relevant for on-demand)

## New Pages

### `src/pages/OnDemandCourses.tsx`
- Public listing page at `/on-demand`
- Grid of on-demand course cards (image, title, description)
- Fetches courses where `is_on_demand = true AND is_published = true`

### `src/pages/OnDemandCourseDetail.tsx`
- Split-pane viewer at `/on-demand/:id` (DeepLearning.AI style)
- Left sidebar: scrollable session list with content-type icons
- Right panel: content area
  - Logged in: full content (YouTube/Vimeo embed, quiz links, external URLs)
  - Not logged in: blurred teaser + "Sign in to continue learning" overlay with Sign Up / Log In buttons
- Video embed helper to parse YouTube/Vimeo URLs into iframe embeds

## Other File Changes

| File | Change |
|------|--------|
| `src/App.tsx` | Add routes `/on-demand` and `/on-demand/:id` |
| `src/pages/Dashboard.tsx` | Add "On-Demand Courses" section showing published on-demand courses |
| `src/components/layout/MainLayout.tsx` | Add "On-Demand" nav link |
| `src/pages/LiveCourses.tsx` | Filter out on-demand courses with `.eq('is_on_demand', false)` |

## Technical Details

### Content type detection (no new column needed)
- `recording_url` contains "youtube" or "vimeo" --> video embed
- Session has `session_quizzes` --> quiz section
- `presentation_url` present --> external link/iframe
- `pre_reading_materials` present --> reading links

### Lead capture flow
- Unauthenticated users see session titles in left panel (sessions are viewable via existing RLS for published courses)
- Right content panel shows blurred overlay with signup CTA
- Auth buttons redirect to `/auth?redirect=/on-demand/:id`

### Admin Courses tab filter state
- New state: `courseFilter` with values `'all'`, `'live'`, `'on-demand'`
- Filtered list: `courses.filter(c => courseFilter === 'all' || (courseFilter === 'on-demand' ? c.is_on_demand : !c.is_on_demand))`

