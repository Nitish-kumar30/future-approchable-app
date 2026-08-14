# Dashboard & Cohort — Bug / Scenario Audit

Files reviewed:

- `src/pages/Dashboard.tsx`
- `src/components/dashboard/CohortSpotlightRow.tsx`
- `src/components/dashboard/WelcomeRow.tsx`
- `src/components/dashboard/ComingSoonRow.tsx`
- `src/components/dashboard/ContinueLearningRow.tsx`
- `src/pages/Cohorts.tsx`
- `src/pages/CohortDetail.tsx`
- `src/hooks/useAuth.tsx` (context)

Inline `// LINT:` markers have been added at each suspicious spot in the code so
you can review side-by-side. Every marker below cites the file it lives in.

---

## 1. User × Cohort scenario matrix

Legend for cohort state (based on DB columns + dates):

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| U    | Upcoming — `start_date > today`                                         |
| O    | Ongoing — `start_date <= today <= end_date` (or `end_date` null)        |
| P    | Past — `end_date < today`                                               |
| ND   | No `start_date` set (admin left it blank / draft)                       |
| NE   | Has `start_date < today` but `end_date` null (ended without being closed) |
| F    | Fully booked (`enrollments >= max_seats`)                               |
| D    | `enrollment_disabled = true`                                            |
| W    | Name matches `/waitlist/i`                                              |
| UP   | Unpublished (only visible via `cohorts` table, not `cohorts_public`)    |

### Anonymous / logged-out visitor

Dashboard is gated by auth, so this only matters for `CohortDetail` accessed by
deep link.

- **Public cohort, any state** → sees "About / Sessions / Mentor" tabs, no
  progress card. "Enroll Now" button triggers redirect to login. OK.
- **Unpublished cohort** → `get-cohort-detail` should 404, but page renders
  skeleton then "Cohort not found". OK.

### Brand-new logged-in user (no enrollments)

| Cohort state | Expected                             | Actual                                       | Verdict |
| ------------ | ------------------------------------ | -------------------------------------------- | ------- |
| U + open     | Spotlight "Upcoming — Register"      | ✅ works                                     | OK      |
| U + D        | Spotlight "Upcoming — Enrollment opening soon" | ✅ works                             | OK      |
| U + F        | Should say "Fully booked" / disable Register | ❌ shows "Register" button, list card also says "Register" | **BUG-05** |
| O + open     | Spotlight "Enrollment open — View details" | ✅ works                                | OK      |
| O + D        | Not surfaced in spotlight            | ✅ no card                                    | OK      |
| P + D        | Hidden entirely from list            | ✅ hidden (non-admin filter)                  | OK      |
| P + open     | "Open Enrollment" category, badge "Closed" | ⚠ label says "Open Enrollment" while badge says "Closed" — contradictory | **BUG-06** |
| NE + open    | Should be treated as Past            | ❌ Shows as "Ongoing" forever on list & spotlight; detail page says "Registration Ended" | **BUG-01** |
| ND + open    | Should show as Upcoming or hidden    | ⚠ Shows as "Upcoming" everywhere (no start_date), sort order undefined | **BUG-10** |
| W            | Fallback waitlist card               | ✅ works, but detection is a regex on `name` — brittle | **BUG-07** |
| UP           | Not visible to non-admin             | ✅ hidden                                     | OK      |

Onboarding empty state: `SignupNextCard` is shown when spotlight has no
candidates. Continue Learning shows "Enroll in a course" empty state. OK.

### Normal enrolled user

| User's cohort | Other catalog | Expected spotlight cards | Actual                | Verdict |
| ------------- | ------------- | ------------------------ | --------------------- | ------- |
| Enrolled in O | any           | Personal (Ongoing + ring) | ✅                    | OK      |
| Enrolled in U | any           | Personal (Upcoming) + upsell if any | ✅         | OK      |
| Enrolled in P (dates ended cleanly with `end_date`) | none open | Personal (Completed/Ended + ring) + `signup_next` nudge | ✅ | OK      |
| Enrolled in NE (start_date past, end_date null) | anything | Should show enrolled_completed | ❌ **No personal card at all** — falls through every rule in CohortSpotlightRow | **BUG-04** |
| Enrolled in ND (no start_date) | anything | Should show something | ❌ same silent drop as NE | **BUG-04** |
| Enrolled in UP (unpublished) + non-admin | anything | Should show personal card | ❌ enrollment join returns null (RLS), catalog fallback is `cohorts_public` which excludes UP → user's own cohort silently disappears from both Dashboard spotlight and Cohorts list | **BUG-02** |
| Enrolled in O + also fully-booked U elsewhere | — | Personal + upsell | Upsell "Register" shown for F cohort | **BUG-05** |
| Enrolled + they hit 100% while dates still running | — | Badge "Completed" | ✅ but category still "Ongoing" | minor UX quirk (BUG-11) |

### Admin

Admin viewing the Cohorts page:

- **Cohorts.tsx** does branch on `isAdmin`: admin queries `cohorts` (all rows,
  including unpublished) and keeps Past cohorts they aren't enrolled in. ✅
- **CohortSpotlightRow.tsx** does **not** consume `isAdmin`. Always queries
  `cohorts_public`. Admin sees zero unpublished cohorts on the dashboard, and
  if the admin themselves is enrolled in an unpublished cohort their
  spotlight silently drops it via the same UP path above. **BUG-03**
- **CohortDetail.tsx** relies on the `get-cohort-detail` edge function to
  gate visibility. Not verifiable from client, but no admin-specific UI —
  admins see "Registration Ended" on past cohorts they authored. OK-ish.

### Enrolled-then-unenrolled ("previously enrolled")

There is no UI to unenroll. `enrollments` rows can only be deleted server-side
or manually. If that happens:

- `isEnrolled` in `CohortDetail` becomes false, learner loses access to
  private session content, quiz submissions still exist orphaned. Not tested
  here; flag for backend review.

### Upcoming cohorts (planning purposes)

- Sort of Upcoming in list uses `localeCompare` on `start_date || ''`. Cohorts
  with `start_date === null` compare with `''` which sorts **before** any real
  date in ascending order → they float to the top of "Upcoming". Almost
  certainly not what you want. **BUG-10**
- `CohortSpotlightRow`'s "next joinable upcoming" pick (`catalog.find`) also
  relies on catalog being ordered by `start_date ASC`. If two cohorts share
  the same start date, order is by insertion — non-deterministic which one
  wins. Low severity.

---

## 2. Bug list

### BUG-01 · Cohort with past `start_date` and null `end_date` is "Ongoing" forever

- Files: `src/pages/Cohorts.tsx` (`isWithinRunningWindow`),
  `src/components/dashboard/CohortSpotlightRow.tsx` (`isOngoing`).
- `notEnded = !cohort.end_date || cohort.end_date >= today` — the `!end_date`
  branch means a cohort that never had an end date but started in 2024 is
  still classified as running.
- Meanwhile `CohortDetail.tsx` (`isPastDated`) falls back to `start_date <
  today` when `end_date` is null and flips the button to "Registration Ended".
- Net: list/spotlight say "Register" / show progress ring, detail page says
  registration ended. Definite inconsistency.
- Suggested fix: treat null `end_date` + past `start_date` as either Past or
  as "Ongoing but registration closed"; make Cohorts.tsx and CohortDetail
  agree on one definition (probably: Ongoing requires either an explicit
  `end_date >= today` OR a session in the future — otherwise Past).

### BUG-02 · Non-admin enrolled in an unpublished cohort silently disappears

- Files: `src/pages/Cohorts.tsx` lines ~185-221,
  `src/components/dashboard/CohortSpotlightRow.tsx` lines ~253-289.
- Both places do `enrollments.select('cohort_id, cohorts(...)')`. That join is
  subject to RLS on `cohorts`. If the cohort is unpublished, non-admin cannot
  see it, and the join returns `cohort_id` with `cohorts = null`.
- The hydrate fallback then tries `catalogById.get(id)` — but `catalogById` is
  built from `cohorts_public`, which by definition excludes unpublished rows.
  So the enrollment is dropped.
- Suggested fix: server-side, `cohorts_public` should include any cohort the
  requesting user is enrolled in regardless of publish flag; or add a
  dedicated `get_my_cohorts` RPC.

### BUG-03 · `CohortSpotlightRow` ignores `isAdmin`

- File: `src/components/dashboard/CohortSpotlightRow.tsx` line 244+.
- Only pulls `user` from `useAuth`, never `isAdmin`. Always queries
  `cohorts_public`. Admins that visit `/dashboard` see the same restricted
  catalog as a normal user — they cannot spot unpublished upcoming cohorts
  they've been working on, and if they're enrolled in one, BUG-02 kicks in.
- Suggested fix: mirror the admin branch pattern from `Cohorts.tsx` (query
  the raw `cohorts` table when `isAdmin`).

### BUG-04 · Enrolled personal spotlight silently drops when cohort has no `start_date` or no `end_date`

- File: `src/components/dashboard/CohortSpotlightRow.tsx` lines ~292-332.
- Rule 1 (`isOngoing`) requires `start_date`.
- Rule 2 (`isUpcomingDate`) requires `start_date`.
- Rule 3 (`enrolled_completed`) requires `end_date && end_date < today`.
- A cohort with `start_date=null` OR (`start_date<today` and `end_date=null`)
  matches none of the rules → `personal` stays `null` → learner sees only the
  upsell/`signup_next` and thinks they aren't enrolled.
- Suggested fix: add a fall-through "unclassified enrolled cohort" bucket
  that still surfaces the card with a generic label.

### BUG-05 · "Register" is shown for fully-booked upcoming/ongoing cohorts

- Files: `src/pages/Cohorts.tsx` (`deriveStatus`, `CohortCard`),
  `src/components/dashboard/CohortSpotlightRow.tsx` (`isJoinableUpcoming`).
- `deriveStatus` returns `Open` any time the cohort isn't enrollment_disabled;
  no seat check. The card button therefore reads "Register" even when the
  seats-left line right above it says "Fully booked".
- `CohortDetail.tsx` at least disables the "Enroll Now" button when seats
  hit zero, but doesn't change its label — you get a greyed-out "Enroll Now"
  with no explanation.
- Suggested fix: propagate `enrollmentCount >= max_seats` into `deriveStatus`
  (new status like `Full`), or at minimum swap the button label to "Waitlist"
  / "Fully booked".

### BUG-06 · Section "Open Enrollment" contains cards whose status badge says "Closed"

- File: `src/pages/Cohorts.tsx` — `deriveStatus` line 83 forces `Closed` for
  cohorts categorized as `Open Enrollment`.
- The category is named for `enrollment_disabled = false`, but the code has
  intentionally decided registering for past-dated cohorts is nonsensical, so
  it labels them Closed. That's a defensible product decision, but the
  section heading "Open Enrollment" then reads as a lie.
- Suggested fix: rename the category (e.g. "Ended — Still open in DB",
  "Recently Ended", or fold them into Past with an explanatory chip).

### BUG-07 · Waitlist detection is a fragile regex over the cohort name

- File: `src/components/dashboard/CohortSpotlightRow.tsx` line 60.
- `/waitlist/i.test(c.name || '')` matches any name containing "waitlist",
  case-insensitive. A real cohort named "Waitlist for Batch 5" will get
  demoted to the fallback path (rule 6) instead of being surfaced as a
  proper cohort. Meanwhile a misnamed cohort with the substring in a
  different context still lands in the waitlist branch.
- Suggested fix: add a dedicated `is_waitlist` boolean on `cohorts`.

### BUG-08 · `check-registration-status` network errors are treated as "not approved"

- File: `src/pages/CohortDetail.tsx` lines ~365-385.
- `if (fnError || !data?.approved)` and the surrounding `try/catch` both jump
  to `setShowPaymentGateDialog(true)`. Any transient failure (offline, edge
  function cold-start timeout) triggers the payment gate even for a learner
  who has already been approved.
- Suggested fix: distinguish network/edge errors from an explicit
  `approved=false` response; show a retry toast for the former.

### BUG-09 · Enrollment race — seats-left is only checked client-side

- File: `src/pages/CohortDetail.tsx` `handleEnroll` lines ~356-414.
- The disabled state on the button is based on `seatsLeft`, but the actual
  `enrollments` insert has no server-side seat cap. Two users clicking with
  the last seat can both succeed.
- Suggested fix: server-side check in a trigger or in the RPC that performs
  the insert; return "cohort_full" and surface it as a friendly error.

### BUG-10 · Cohorts sort: cohorts with null `start_date` bubble to the top of Upcoming

- File: `src/pages/Cohorts.tsx` lines 283-288.
- `a.cohort.start_date || ''` — the empty string sorts before any real ISO
  date in ascending, so a draft/no-date cohort placed in the Upcoming bucket
  (see BUG-04 variant) sits at the top.
- Suggested fix: filter out `start_date == null` from Upcoming (or push them
  to the bottom explicitly).

### BUG-11 · Enrolled learner hits 100% while dates still running → weird category vs badge

- File: `src/pages/Cohorts.tsx` `deriveCategory` + `deriveStatus`.
- Category stays `Ongoing` (dates are current) but status becomes `Completed`.
- Card ends up in "Ongoing Cohorts" section with a "Completed" badge — minor
  visual dissonance.
- Suggested fix: if `progress >= 100`, move the card into Past OR change the
  section grouping to blend Ongoing-Completed into Completed.

### BUG-12 · `Cohorts` `useEffect` never clears `items` when user changes

- File: `src/pages/Cohorts.tsx` line 164+.
- When user logs out or switches identities, the effect re-runs but
  `setItems(list)` only fires after the new fetch resolves. Old user's list
  is briefly visible to the new user — minor privacy leak on shared devices.
- Suggested fix: `setItems([])` and `setIsLoading(true)` at the top of the
  effect.

### BUG-13 · Progress computed differently in Cohorts list vs CohortDetail

- Files: `src/pages/Cohorts.tsx` uses `compute_enrollment_progress_percent`
  RPC; `src/pages/CohortDetail.tsx` uses `completedSessions / sessions.length`
  computed client-side from `session_progress`.
- These can disagree if the RPC has additional weighting (e.g. quizzes).
- Suggested fix: pick one source of truth. If the RPC exists, use it in
  detail too — the detail page already knows `cohort.id`.

### BUG-14 · `averageScore` in CohortDetail treats unattempted quizzes as absent, not zero

- File: `src/pages/CohortDetail.tsx` lines ~470-476.
- If a learner attempted 1 of 10 quizzes and scored 100%, their "Avg Score"
  badge reads 100%.
- Suggested fix: divide by total quizzes in cohort, not attempted count; or
  label the badge "Avg of attempted".

### BUG-15 · `SignupNextCard` opens `/registration` in a new tab from inside an authenticated shell

- File: `src/components/dashboard/CohortSpotlightRow.tsx` line 107.
- Every other CTA on the dashboard uses SPA navigation. This one is
  `target="_blank"` — unusual, breaks the flow, no obvious reason.
- Suggested fix: drop the `target/rel`.

### BUG-16 · `ComingSoonRow` hardcodes 2026 dates in-source

- File: `src/components/dashboard/ComingSoonRow.tsx` lines 60-93.
- `Aug 20`, `Sep 17`, `Oct 15`, `Nov 19` are string literals with no date
  filtering. Once Aug 20 passes, the card still says "Aug 20 · 7:00 PM IST"
  with the "Next up" pill on it. Also breaks year over year.
- Suggested fix: move to DB (`upcoming_sessions` table) or at minimum add a
  date-based filter that hides / re-labels past sessions.

### BUG-17 · Leaderboard is fetched exactly once per mount

- File: `src/pages/CohortDetail.tsx` `fetchLeaderboard` lines 416-449.
- `leaderboardFetched` gates it. Learner completes another session, comes
  back to the leaderboard tab → still stale.
- Suggested fix: refetch when tab regains focus, or on a soft cache TTL
  (5 min).

### BUG-18 · Continue Learning: `chapter_progress` join relies on `chapters(sessions(course_id))` staying non-null

- File: `src/components/dashboard/ContinueLearningRow.tsx` lines 128-163.
- If a chapter was deleted or its session was re-parented, `courseId` is
  null and the row is silently skipped. Not a security bug but the "Last:"
  line disappears without explanation.

### BUG-19 · Payment-gate dialog says "commitment fee" with no amount/currency

- File: `src/pages/CohortDetail.tsx` lines 1077-1099.
- User-facing copy tells them a fee applies but shows no amount, and the
  "Register Now" button goes to a generic `/registration` page. Very likely
  a UX regression given the pricing/localization work elsewhere in the app.

### BUG-20 · Public-vs-private sessions race in CohortDetail

- File: `src/pages/CohortDetail.tsx` lines 220-241 (`fetchSessions`) vs
  243-354 (`fetchEnrolledContent`).
- Both run concurrently; `enrolledContentLoadedRef` guards the *public*
  fetch from overwriting the private one, but there is no reverse guard —
  if public sessions arrive after enrolled content (rare but possible on
  slow networks with a cold public function), private data is overwritten
  with public. Suggest: guard both directions with a version counter, or
  cancel the public fetch if the user is already known to be enrolled.

---

## 3. Not bugs but worth flagging

- `WelcomeRow` falls back to "Learner" if `profiles.full_name` is empty. Fine,
  but a new signup that hasn't completed profile will always see
  "Welcome back, Learner" as their very first impression. Consider using
  `user.email` prefix as a secondary fallback.
- `formatCohortDateRange` uses `new Date(dateStr)` which parses `YYYY-MM-DD`
  as UTC. In IST (`Asia/Kolkata`, +5:30) it always displays the correct day
  because `toLocaleDateString` respects the local zone — but a user in `UTC-8`
  will see the date shift by one day. Low priority.
- `formatCohortDateRange` header comment example is wrong: says
  `"Feb 11-Feb 4, 4:50PM IST"` (end < start). Just a docstring typo.
- Admin branch in `Cohorts.tsx` triggers a **double fetch** because
  `isAdmin` starts as `false` and flips to `true` after the role check
  resolves. The effect deps `[user, isAdmin]` cause an initial
  `cohorts_public` fetch followed by a `cohorts` fetch. Not incorrect,
  just wasteful — could gate the effect on `!authLoading`.
- Cohort detail page — no "You are enrolled but not yet approved" state
  distinct from "not enrolled". If enrollment insert succeeded but the
  cohort is gated behind separate approval, the UI shows full enrolled UI
  including quick links / meeting links.

---

## 4. Suggested review order

1. BUG-01, BUG-02, BUG-04 — silent data drops or state inconsistencies that
   affect real learners today.
2. BUG-03 — admin-visibility regression on dashboard.
3. BUG-05, BUG-08, BUG-09 — enroll flow correctness / anti-abuse.
4. BUG-06, BUG-11, BUG-16, BUG-19 — labeling / UX contradictions.
5. Everything else — cleanup and hardening.
