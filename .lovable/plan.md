

# Improve On-Demand Course Layout — Video & Progress Visible Without Scrolling

## Problem
The current layout has too much vertical space consumed before the video:
- PublicHeader: 64px
- Course header (back link + title + mentor): ~100px
- Total: ~164px wasted before the split pane starts

In the DeepLearning.AI reference, the header is compact and the course title lives in the sidebar, so the video fills the viewport immediately.

## Changes

### 1. Merge course header into the sidebar
Move the back link, course title, mentor name, and feedback button out of the separate "course header" bar and into the top of the left sidebar. This eliminates the entire course header section (~100px saved).

The sidebar will now show:
- Back link (small)
- Course title (compact)
- Mentor name
- Feedback button
- Lesson list
- Progress bar at bottom

### 2. Make the split pane fill the remaining viewport
Change the split pane container to use `h-[calc(100vh-4rem)]` (viewport minus header height) so sidebar and content area fill the screen without scrolling.

### 3. Adjust sidebar ScrollArea height
Update the ScrollArea to use `flex-1` with proper overflow so lessons scroll within the sidebar while the progress bar stays pinned at the bottom — all within viewport height.

### 4. Remove the content area top padding
Reduce `p-6 md:p-8` on the content area to `p-4 md:p-6` so the video sits closer to the top.

---

### Technical Details

**File: `src/pages/OnDemandCourseDetail.tsx`**

- Remove the "Course header" `<div>` block (lines 273-291) entirely
- Move back link, title, mentor, and feedback button into the sidebar `<aside>`, above the "Lessons" heading
- Change the split pane container from `flex-1` to `flex-1 h-[calc(100vh-4rem)]` to lock it to viewport
- Update sidebar ScrollArea to properly fill remaining space
- Reduce right panel padding from `p-6 md:p-8` to `p-4 md:p-6`
- Make the course title in sidebar smaller (text-lg instead of text-2xl) to keep it compact

These are purely layout/CSS changes in a single file — no database or logic changes needed.

