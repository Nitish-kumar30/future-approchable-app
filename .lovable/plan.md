# Sidebar App Shell + New Home Dashboard

Move from the top-nav + card-grid layout to a left-sidebar app shell with a consolidated, denser Home dashboard. Data comes from one backend call per page instead of many client-side queries.

## Navigation (left sidebar)

Order, top to bottom:

1. Home (`/dashboard`)
2. Cohorts (`/cohorts`)
3. Courses (`/courses`)
4. Free (`/free`, current on-demand listing)
5. Resources (`/resources`)
6. Admin (`/admin`, admins only)

Pinned at the bottom: an "Upgrade to Annual Membership" card marked **Coming soon** (disabled, non-clickable).

Behaviour: collapsible to an icon rail (trigger always visible in the top bar), active route highlighted, mobile keeps a bottom bar with the same items. Old top-nav header is replaced by a slim top bar holding the sidebar trigger, page title, and the user avatar menu.

## Home dashboard

**Row 0 — Welcome**: "Welcome back, {first name}" plus a one-line subtext, tight spacing.

**Row 1 — Cohort spotlight (wide) + progress ring (narrow)**
- If enrolled in an ongoing cohort: show it with dates, mentor, next action; ring chart shows the user's cohort progress percent.
- Else if an upcoming published cohort exists: show it with an "Upcoming" tag and a register CTA (no ring).
- Else: show the waitlist cohort card with a register CTA.

**Row 2 — Upcoming live session + Community**, both rendered as **Coming soon** placeholder cards (membership feature), visually consistent, no data fetch.

**Row 3 — Continue learning**: every course the user is enrolled in and has started or not yet finished (live courses and free/on-demand together), each with a progress bar, percent, last-touched chapter, and a Resume button linking to the learn page. Empty state links to Courses.

## Page changes

- **Cohorts**: shows the user's cohorts only — ongoing (tag "Ongoing"), upcoming (tag "Upcoming"), and the user's past cohorts (tag "Completed"). No global list of all past cohorts. Open/joinable upcoming cohorts still appear so users can register.
- **Courses**: three tabs — *Courses* (existing paid/live listing), *Free* (existing on-demand listing), *My Courses* (all enrolled courses with progress). The `Free` sidebar item deep-links to the Free tab route.
- **Resources**: new page with two tiles — Prompt Library (`/prompts`) and Prompting Guide (opens the existing guide modal/page).
- **Admin**: unchanged tabs, rendered inside the new shell.

## Visual direction

Tighter, more professional shell: reduced base font size and heading scale, 4px-grid spacing, denser cards (smaller padding, thinner borders, subtle shadows), consistent 12/14/16px type ramp, muted section labels in small caps. All values via existing design tokens in `index.css` / `tailwind.config.ts` — no hardcoded colors.

## Technical notes

- New `AppShell` layout using the shadcn sidebar primitives (`SidebarProvider`, `Sidebar`, `SidebarTrigger`), replacing `MainLayout` usage page by page. `MainLayout` stays until all pages migrate, then is removed.
- Backend consolidation: a new read-only edge function `get-dashboard` returns, in one call, the user's enrollments, cohort status buckets (ongoing/upcoming/past), per-course progress percents, and the fallback upcoming/waitlist cohort. Home, Cohorts, and Courses/My Courses read from it (Cohorts and Courses may take a scoped variant of the same function). Existing pages drop their direct `supabase.from(...)` queries in favour of this.
- Progress reuses the existing `compute_enrollment_progress_percent` DB function rather than recounting client-side.
- New routes: `/free`, `/resources`. `/on-demand` keeps working (redirect to `/free`).

## Build order

1. `AppShell` + sidebar nav + top bar + upgrade card; migrate existing pages into it (no data changes).
2. Typography/spacing pass on tokens and shared card styles.
3. `get-dashboard` edge function.
4. New Home dashboard rows.
5. Cohorts page scoping to user cohorts with tags.
6. Courses tabs (Courses / Free / My Courses) + `/free` route.
7. Resources page.

## Confirmation needed

Per project rule, edge functions are created only after your OK: this plan adds one read-only function, `get-dashboard`. Approving the plan is taken as approval for it.
