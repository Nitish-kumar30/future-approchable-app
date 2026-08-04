# Dashboard + Layout Redesign (reference mockup)

Goal: move from the current top-nav + card-grid dashboard to a left-sidebar app shell with a richer "Home" dashboard (stat strip, upcoming live sessions, community panel, continue-learning progress cards).

## What already exists

| Mockup element | Status today |
|---|---|
| Brand mark + "Approachable" wordmark | Exists (`MainLayout`, top header) |
| Nav items: Cohorts, Courses, On-Demand, Prompts, Admin | Exist as top-nav links |
| Profile avatar + dropdown (profile, sign out) | Exists |
| "Welcome back!" greeting | Exists |
| Three stat cards | Exists (counts only, not "Active Cohort / Next Session / Progress") |
| Enrolled cohorts + courses cards | Exists |
| On-demand course cards | Exists |
| Mobile bottom nav | Exists |
| Sessions with date/time and meeting link | Exist in DB (`sessions.session_date`, `cohorts.session_time`, `meeting_link`) |
| Per-course progress % | Exists (`compute_enrollment_progress_percent`, `chapter_progress`) |

## What needs building

**Simple**
- Sidebar shell: convert the top nav into a fixed left sidebar (collapsible on tablet, existing bottom nav retained on mobile). Pure layout work in `MainLayout`.
- Greeting with the learner's first name (already available from the profile record).
- Stat strip redesign: replace the three count cards with "Active Cohort", "Next Live Session", "Overall Progress" (ring chart). All three derive from data the dashboard already fetches or can fetch with one extra query.
- "Continue Learning" row: course cards with a progress bar + percentage, replacing the current plain enrolled-course cards.
- Rename the dashboard nav label to "Home".

**Medium**
- Upcoming Live Sessions panel: list the next N sessions across the user's enrolled cohorts with a Join button that opens the cohort meeting link. Needs a new read path (edge function) that returns upcoming sessions for the signed-in user, since meeting links are enrollment-gated.
- Progress ring + aggregate progress across all enrollments: needs a single call that returns per-enrollment progress instead of the current per-cohort loop (the dashboard currently fires one query per cohort).
- Consolidating the dashboard's many client-side queries into one `get-dashboard` edge function (also aligns with the project rule that DB reads go through edge functions).
- "Resources" nav section: no such concept exists; would reuse pre-reading materials + mini-projects aggregated across enrolled courses.

**Complex**
- Community panel ("Ask questions, share wins", member avatars, +120 count): no community feature, no posts/threads tables, no membership avatars. This is a whole feature — either build a lightweight cohort discussion board (tables, RLS, edge functions, UI) or make the panel a link out to an existing external group (WhatsApp/Discord) using `cohorts.group_link`, which would be Simple instead.
- "1-on-1 Mentorship" nav section: no booking, availability, or session-request model exists. Full feature (scheduling, admin views, notifications).
- Notification bell: no notifications table, no producers, no read-state. Full feature.
- "Live Sessions" as a first-class nav section (a calendar-style view across cohorts) — moderate-to-complex depending on whether it needs calendar UI and RSVP.

## Suggested phasing

1. Sidebar shell + Home dashboard restyle (stat strip, continue-learning progress cards) — visual parity for most of the mockup.
2. Upcoming Live Sessions panel + consolidated `get-dashboard` edge function.
3. Community panel as an external-link card (cheap), Resources page.
4. Defer notifications, mentorship, and in-app community unless you want them scoped as separate projects.

## Technical notes

- `MainLayout` currently owns header, mobile nav, promo banner and footer; the sidebar variant would live in the same file with the mobile bottom nav unchanged.
- New reads must go through edge functions per project convention; `get-enrollments` and `get-cohort-detail` already exist and can be extended or wrapped rather than duplicated.
- All colors must come from existing semantic tokens in `index.css`; the mockup's indigo accent maps to the current `primary`.
