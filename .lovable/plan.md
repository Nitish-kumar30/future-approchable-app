# Sidebar App Shell + New Home Dashboard

Move from top-nav + card-grid to a left-sidebar app shell with a denser, more professional Home dashboard. Data consolidated into one backend call instead of many client-side queries.

## Navigation (left sidebar)

1. Home (`/dashboard`)
2. Cohorts (`/cohorts`)
3. Courses (`/courses`)
4. Free (`/free` — today's on-demand listing)
5. Resources (`/resources`)
6. Admin (`/admin`, admins only)

Pinned at the bottom: "Upgrade to Annual Membership" card, tagged **Coming soon**, disabled.

Sidebar collapses to an icon rail; trigger always visible in the slim top bar (page title + avatar menu). Mobile keeps a bottom bar with the same items.

## Home dashboard

- **Welcome** — "Welcome back, {first name}" with a one-line subtext.
- **Row 1** — Cohort spotlight (wide) + progress ring (narrow).
  - Ongoing cohort the user is in → dates, mentor, continue CTA, ring with their progress %.
  - Else next upcoming published cohort → "Upcoming" tag, register CTA, no ring.
  - Else waitlist cohort → register-for-waitlist CTA.
- **Row 2** — "Upcoming live session" and "Community", both **Coming soon** placeholders (membership feature), no data fetch.
- **Row 3** — "Continue learning": every enrolled course (paid and free/on-demand) in progress, with progress bar, %, and Resume link to the learn page. Empty state links to Courses.

## Page changes

- **Cohorts** — only the user's cohorts plus joinable upcoming ones. Tags: Ongoing / Upcoming / Completed. No global list of all past cohorts.
- **Courses** — tabs: *Courses* (existing listing), *Free* (existing on-demand listing), *My Courses* (enrolled, with progress). The Free sidebar item deep-links to the Free tab.
- **Resources** — new page, two tiles: Prompt Library and Prompting Guide.
- **Admin** — unchanged tabs, inside the new shell.

## Visual direction

Tighter and more professional: smaller base type with a consistent 12/14/16/20 ramp, 4px spacing grid, denser cards (less padding, thin borders, subtle shadow), muted small-caps section labels. All via existing tokens in `index.css` / `tailwind.config.ts` — no hardcoded colors.

## Step-by-step build

1. **Shell** — new `AppShell` (shadcn `SidebarProvider` / `Sidebar` / `SidebarTrigger`) with the six nav items, bottom upgrade card, top bar, mobile bar. Route guard behaviour matches today's `MainLayout`.
2. **Migrate pages** — swap `MainLayout` for `AppShell` on Dashboard, Cohorts, Courses, On-Demand, Prompts, Admin, Profile. No data changes yet. Remove `MainLayout` once unused.
3. **Type/spacing pass** — tighten tokens and shared card/heading styles across the shell and cards.
4. **Backend consolidation** — one read-only edge function `get-dashboard` returning: user enrollments, cohorts bucketed into ongoing/upcoming/past, the fallback upcoming-or-waitlist cohort, and per-course/per-cohort progress percents (via the existing `compute_enrollment_progress_percent`). Accepts an optional scope so Cohorts and My Courses reuse it.
5. **Home dashboard** — rebuild `Dashboard.tsx` with the three rows above, reading only from `get-dashboard`; delete its direct `supabase.from(...)` calls.
6. **Cohorts page** — scope to the user's cohorts with the three tags, fed by the same function.
7. **Courses page** — add the three tabs, add `/free` route (`/on-demand` redirects to it), My Courses tab fed by the same function.
8. **Resources page** — new `/resources` route with the two tiles.

## Notes

- New routes: `/free`, `/resources`.
- Per project rule, edge functions need your OK: this adds one read-only function, `get-dashboard`. Approving this plan approves it.
