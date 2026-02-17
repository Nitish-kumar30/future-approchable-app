

# Drip Content: Admin-Controlled Session Content Visibility

## Overview
Add a per-session toggle that lets admins control whether enrolled learners can see the detailed content (quizzes, pre-reading materials, mini projects, recording/slides links) for each session. Session title, description, date, and order remain always visible. By default, content is locked -- the admin explicitly unlocks sessions as the cohort progresses.

## How It Works

**Admin side**: Each session gets an `is_content_unlocked` toggle (default: off). The admin can flip this from the Sessions tab or when editing a session.

**Learner side**: For locked sessions, a message like "Content will be available soon" replaces the quizzes/materials/projects sections. Session title and description remain visible so learners know what's coming.

## Technical Changes

### 1. Database Migration
- Add `is_content_unlocked BOOLEAN NOT NULL DEFAULT false` column to the `sessions` table.

### 2. Admin Page (`src/pages/Admin.tsx`)
- Add a quick-toggle (switch) in the sessions table row so admins can unlock/lock content without opening the edit form.
- When toggled, update the `is_content_unlocked` field on the session directly.

### 3. Session Form (`src/components/admin/SessionForm.tsx`)
- Add a Switch/Checkbox labeled "Unlock content for learners" so admins can also set this when creating or editing a session.

### 4. Cohort Detail Page (`src/pages/CohortDetail.tsx`)
- Add `is_content_unlocked` to the Session interface.
- In the enrolled view, check `session.is_content_unlocked` before rendering:
  - Pre-reading materials
  - Recording/Slides buttons
  - Quizzes
  - Mini projects
- When locked, show a subtle message with a Lock icon: "This session's content will be available soon."

### 5. Course Detail Page (`src/pages/CourseDetail.tsx`)
- Apply the same content-gating logic for consistency.

### 6. Types Update
- The `is_content_unlocked` column will auto-appear in the generated types after migration.

## What Stays Visible (Even When Locked)
- Session title
- Session description
- Session date
- Session order/number
- Completion badge (if already completed)

## What Gets Hidden (When Locked)
- Quizzes
- Pre-reading materials
- Mini projects
- Recording URL button
- Slides/Presentation URL button

