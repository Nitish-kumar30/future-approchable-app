# Sidebar App Shell + New Home Dashboard

Move from the top-nav + card-grid layout to a left-sidebar app shell with a denser, more professional Home dashboard.

## Navigation (left sidebar)

1. Home (`/dashboard`)
2. Cohorts (`/cohorts`)
3. Courses (`/courses`)
4. Free (`/free` — current on-demand listing)
5. Resources (`/resources`)
6. Admin (`/admin`, admins only)

Pinned at the bottom: an "Upgrade to Annual Membership" card marked **Coming soon** (disabled, non-clickable).

Behaviour: collapsible to an icon rail with the trigger always visible in the top bar, active route highlighted, mobile keeps a bottom bar with the same items. The old top-nav header becomes a slim top bar holding the sidebar trigger, page title, and avatar menu.

## Home dashboard

**Row 0 — Welcome**: "Welcome back, {first name}" plus a one-line subtext, tight spacing.

**Row 1 — Cohort spotlight (wide) + progress ring (narrow)**
- Enrolled in an ongoing cohort: dates, mentor, link to cohort details; ring chart shows the user's cohort progress percent.
- Else next upcoming cohort (start date in the future, published, enrollment not closed): "Upcoming" tag + register CTA, no ring.
- Else: waitlist cohort card with a register CTA.

**Row 2 — Upcoming live session + Community**: both static **Coming soon** placeholder cards (live session = membership feature, community = free feature). No data fetch.

**Row 3 — Continue learning**: every enrolled course, paid and free/on-demand together, that is started or unfinished — progress bar, percent, last-touched chapter, Resume button to the learn page. Empty state links to Courses.

Each row loads independently and renders as soon as its own data arrives, with per-row skeletons, so the page paints fast rather than waiting on one big call.

## Page changes

- **Cohorts** — the user's cohorts only: Ongoing, Upcoming, Completed tags. No global list of all past cohorts. Open/joinable upcoming cohorts still appear so users can register.
- **Courses** — three tabs: *Courses* (existing paid/live listing), *Free* (existing on-demand listing), *My Courses* (enrolled courses with progress). The Free sidebar item deep-links to the Free tab.
- **Resources** — new page with two tiles: Prompt Library (`/prompts`) and Prompting Guide (opens the existing guide modal).
- **Admin** — unchanged tabs, rendered inside the new shell.

## Visual direction

Tighter, more professional: reduced base font size and heading scale, 4px spacing grid, denser cards (smaller padding, thinner borders, subtle shadows), a consistent 12/14/16px type ramp, muted small-caps section labels. All values from existing tokens in `index.css` / `tailwind.config.ts` — no hardcoded colors.

## Technical notes

- New `AppShell` built on shadcn sidebar primitives (`SidebarProvider`, `Sidebar`, `SidebarTrigger`), replacing `MainLayout` page by page; `MainLayout` is removed once nothing uses it.
- No consolidated dashboard call. Each dashboard row owns its own fetch, fired in parallel on mount.
- Progress values come from the existing `compute_enrollment_progress_percent` DB function rather than recounting client-side.
- New routes `/free` and `/resources`; `/on-demand` redirects to `/free`.

## Build order

1. `AppShell` + sidebar nav + top bar + upgrade card; migrate existing pages into it, no data changes.
2. Typography/spacing pass on tokens and shared card styles.
3. New Home dashboard rows.
4. Cohorts page scoped to the user's cohorts with tags.
5. Courses tabs (Courses / Free / My Courses) + `/free` route.
6. Resources page.

## Confirmation

No new edge functions and no schema changes are needed; rows reuse existing endpoints and the existing progress function.
