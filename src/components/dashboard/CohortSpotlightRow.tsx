import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCohortDateRange } from '@/lib/formatCohortDate';
import { cn } from '@/lib/utils';
import { Calendar, GraduationCap, ArrowRight } from 'lucide-react';
import ProgressRing from './ProgressRing';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  session_time: string | null;
  enrollment_disabled: boolean;
}

type SpotlightMode =
  | 'ongoing'
  | 'enrolled_upcoming'
  | 'enrolled_completed'
  | 'upcoming'
  | 'upcoming_closed'
  | 'open_enrollment'
  | 'waitlist'
  | 'signup_next';

interface SpotlightState {
  mode: SpotlightMode;
  cohort: Cohort | null;
  progress: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function isOngoing(c: Cohort): boolean {
  if (!c.start_date) return false;
  const today = todayIso();
  const started = c.start_date <= today;
  // LINT (BUG-01): same forever-ongoing issue as Cohorts.tsx — a null
  // end_date + past start_date returns true here indefinitely.
  const notEnded = !c.end_date || c.end_date >= today;
  return started && notEnded;
}

function isUpcomingDate(c: Cohort): boolean {
  if (!c.start_date) return false;
  return c.start_date > todayIso();
}

function isJoinableUpcoming(c: Cohort): boolean {
  // LINT (BUG-05): seat availability is not checked here. A fully-booked
  // upcoming cohort still qualifies as "joinable" and gets a Register CTA
  // on the spotlight card.
  return isUpcomingDate(c) && !c.enrollment_disabled;
}

function isWaitlist(c: Cohort): boolean {
  // LINT (BUG-07): brittle detection based on the display name. Any cohort
  // whose title happens to contain "waitlist" is demoted to the fallback
  // branch; add an explicit `is_waitlist` DB column.
  return /waitlist/i.test(c.name || '');
}

/** True once a cohort's window has fully closed (both start and end dates
 * are in the past). Used to keep long-ended cohorts out of the "come join
 * this" upsell fallback even when an admin forgot to flip
 * `enrollment_disabled` — a stale cohort should never look freshly open. */
function hasEnded(c: Cohort): boolean {
  if (!c.start_date) return false;
  const today = todayIso();
  return c.start_date <= today && !!c.end_date && c.end_date < today;
}

/** True for any spotlight card whose cohort hasn't started yet — regardless of
 * whether it's the learner's own upcoming enrollment or an open upsell. Used
 * to give upcoming cohorts a golden highlight and lead position in the row. */
function isUpcomingState(state: SpotlightState): boolean {
  return !!state.cohort && isUpcomingDate(state.cohort);
}

function sectionLabelFor(mode: SpotlightMode): string {
  switch (mode) {
    case 'ongoing':
      return 'Active cohort';
    case 'enrolled_upcoming':
    case 'enrolled_completed':
      return 'Your cohort';
    case 'upcoming':
    case 'upcoming_closed':
      return 'Upcoming cohort';
    case 'open_enrollment':
      return 'Enrollment open';
    case 'waitlist':
      return 'Waitlist';
    default:
      return 'Cohort';
  }
}

// Shown whenever there's no cohort currently open for registration — either as
// the only card (brand-new user, nothing to show at all) or alongside a
// personal cohort card (enrolled user between cohorts, nothing new to join yet).
function SignupNextCard() {
  return (
    <Card className="card-elevated overflow-hidden">
      <CardContent className="p-4 flex flex-col sm:flex-row items-stretch gap-4">
        <div className="min-w-0 space-y-2 flex-1">
          <p className="section-label">Next cohort</p>
          <h3 className="text-base font-semibold text-foreground leading-snug">
            Signup for next Cohort when it opens
          </h3>
          <p className="text-xs text-muted-foreground">
            Registration isn't open yet — get on the list to be first in line.
          </p>
          <div className="pt-1">
            <Button size="sm" className="h-8 text-xs" asChild>
              {/* LINT (BUG-15): this is the only CTA on the dashboard that opens
                  in a new tab. Every other card uses SPA navigation. */}
              <Link to="/registration" target="_blank" rel="noopener noreferrer">
                Signup for next Cohort <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpotlightCard({ state }: { state: SpotlightState }) {
  const { cohort, mode, progress } = state;
  if (mode === 'signup_next' || !cohort) {
    return <SignupNextCard />;
  }
  const dateLabel = formatCohortDateRange(cohort.start_date, cohort.end_date, cohort.session_time);
  const showRing = mode === 'ongoing' || mode === 'enrolled_completed';
  const isEnrolledView =
    mode === 'ongoing' || mode === 'enrolled_upcoming' || mode === 'enrolled_completed';
  const sectionLabel = sectionLabelFor(mode);
  // Any cohort that hasn't started yet — whether it's the learner's own
  // upcoming seat or an open upsell — gets a golden highlight so it stands
  // out as "the one coming up next."
  const isHighlighted = isUpcomingState(state);

  return (
    <Card
      className={cn(
        'card-elevated overflow-hidden',
        isHighlighted &&
          'border-amber-400/50 bg-gradient-to-br from-amber-400/10 via-amber-300/5 to-transparent shadow-[0_0_0_1px_rgba(251,191,36,0.25)]',
      )}
    >
      <CardContent className="p-4 flex flex-col sm:flex-row items-stretch gap-4">
        <div className="min-w-0 space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="section-label">{sectionLabel}</p>
            {mode === 'enrolled_upcoming' && (
              <>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] h-5',
                    isHighlighted && 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40',
                  )}
                >
                  Upcoming
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5">Enrolled</Badge>
              </>
            )}
            {mode === 'enrolled_completed' && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {progress >= 100 ? 'Completed' : 'Ended'}
              </Badge>
            )}
            {(mode === 'upcoming' || mode === 'upcoming_closed') && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] h-5',
                  isHighlighted && 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40',
                )}
              >
                Upcoming
              </Badge>
            )}
            {mode === 'upcoming_closed' && (
              <Badge variant="outline" className="text-[10px] h-5">Enrollment opening soon</Badge>
            )}
            {mode === 'open_enrollment' && (
              <Badge variant="secondary" className="text-[10px] h-5">Enrollment open</Badge>
            )}
            {mode === 'waitlist' && (
              <Badge variant="secondary" className="text-[10px] h-5">Waitlist</Badge>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground leading-snug">{cohort.name}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {cohort.mentor_name && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {cohort.mentor_name}
              </span>
            )}
            {dateLabel && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateLabel}
              </span>
            )}
          </div>
          <div className="pt-1">
            {isEnrolledView ? (
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link to={`/cohorts/${cohort.id}`}>
                  View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : mode === 'upcoming_closed' ? (
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link to="/cohorts">
                  See all cohorts <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : mode === 'open_enrollment' ? (
              // Dates already passed here — "Register" would be misleading,
              // so this just links through to the details instead.
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link to={`/cohorts/${cohort.id}`}>
                  View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" className="h-8 text-xs" asChild>
                <Link to={`/cohorts/${cohort.id}`}>
                  Register <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {showRing && (
          <>
            <div className="hidden sm:block w-px bg-border" />
            <div className="flex items-center justify-center sm:w-36 shrink-0">
              <ProgressRing percent={progress} label="Cohort progress" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CohortSpotlightRow() {
  // LINT (BUG-03): unlike Cohorts.tsx, this component never consults
  // `isAdmin` from useAuth. Admins visiting the dashboard only see cohorts
  // in `cohorts_public` — unpublished cohorts they authored (or are enrolled
  // in) are invisible here.
  const { user } = useAuth();
  const [states, setStates] = useState<SpotlightState[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // LINT (BUG-02): same silent-drop as Cohorts.tsx — RLS on the joined
      // `cohorts` returns null for unpublished cohorts, and the catalog
      // fallback below is `cohorts_public` which also excludes them, so a
      // non-admin learner enrolled in an unpublished cohort loses their
      // personal spotlight entirely.
      const [{ data: enrollments }, { data: publicCohorts }] = await Promise.all([
        supabase
          .from('enrollments')
          .select(
            `
            cohort_id,
            cohorts (
              id, name, description, mentor_name, start_date, end_date, session_time, enrollment_disabled
            )
          `,
          )
          .eq('user_id', user.id)
          .not('cohort_id', 'is', null),
        supabase
          .from('cohorts_public' as any)
          .select(
            'id, name, description, mentor_name, start_date, end_date, session_time, enrollment_disabled',
          )
          .order('start_date', { ascending: true }),
      ]);

      if (cancelled) return;

      const catalog = (publicCohorts || []) as unknown as Cohort[];
      const catalogById = new Map(catalog.map((c) => [c.id, c]));

      // Resolve enrolled cohorts from the join; fall back to catalog by cohort_id if join is null
      const enrolledMap = new Map<string, Cohort>();
      for (const row of enrollments || []) {
        const joined = row.cohorts as unknown as Cohort | null;
        const id = joined?.id || (row.cohort_id as string | null);
        if (!id) continue;
        const cohort = joined || catalogById.get(id);
        if (cohort) enrolledMap.set(id, cohort);
      }
      const enrolled = Array.from(enrolledMap.values());
      const enrolledIds = new Set(enrolledMap.keys());

      // ── Personal spotlight: the learner's own live cohort status. A ──
      // learner can legitimately be enrolled in an ongoing cohort AND a
      // separate upcoming one at the same time (e.g. finishing one cohort
      // while already signed up for the next) — rules 1 and 2 are computed
      // independently so a second live enrollment is never silently dropped
      // just because the first rule already matched.
      const personalCards: SpotlightState[] = [];

      // 1) Enrolled in an ongoing cohort → spotlight + progress ring
      const ongoing = enrolled.find(isOngoing);
      if (ongoing) {
        const { data: percent } = await supabase.rpc('compute_enrollment_progress_percent', {
          p_user_id: user.id,
          p_cohort_id: ongoing.id,
        });
        if (cancelled) return;
        personalCards.push({ mode: 'ongoing', cohort: ongoing, progress: Number(percent) || 0 });
      }

      // 2) Enrolled in a separate upcoming cohort → your cohort, View details (never Register)
      const enrolledUpcoming = enrolled
        .filter(isUpcomingDate)
        .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))[0];
      if (enrolledUpcoming) {
        personalCards.push({ mode: 'enrolled_upcoming', cohort: enrolledUpcoming, progress: 0 });
      }

      // 3) No live (ongoing/upcoming) enrollment — fall back to their most
      // recent past/completed one with a progress ring.
      if (personalCards.length === 0) {
        // LINT (BUG-04): requires `end_date` to be set. An enrolled cohort
        // whose admin never entered end_date (or never entered start_date
        // at all) satisfies none of rules 1/2/3 → the learner sees no
        // personal spotlight and only the upsell/signup_next card, giving
        // the impression they aren't enrolled anywhere.
        const enrolledCompleted = enrolled
          .filter((c) => c.end_date && c.end_date < todayIso())
          .sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''))[0];
        if (enrolledCompleted) {
          const { data: percent } = await supabase.rpc('compute_enrollment_progress_percent', {
            p_user_id: user.id,
            p_cohort_id: enrolledCompleted.id,
          });
          if (cancelled) return;
          personalCards.push({
            mode: 'enrolled_completed',
            cohort: enrolledCompleted,
            progress: Number(percent) || 0,
          });
        }
      }

      // ── Upsell: surface an open-to-register cohort, but only when the ──
      // learner doesn't already have both personal slots filled (ongoing +
      // upcoming) — two live enrollments are enough to look at without
      // adding an upsell nobody asked for.
      let upsell: SpotlightState | null = null;
      if (personalCards.length < 2) {
        // 4) Next upcoming in catalog that user is NOT enrolled in, enrollment open → Register
        const upcoming = catalog.find((c) => isJoinableUpcoming(c) && !enrolledIds.has(c.id));
        if (upcoming) {
          upsell = { mode: 'upcoming', cohort: upcoming, progress: 0 };
        } else {
          // 5) Next upcoming in catalog, enrollment closed → Coming soon (no Register)
          const upcomingClosed = catalog.find(
            (c) => isUpcomingDate(c) && c.enrollment_disabled && !enrolledIds.has(c.id),
          );
          if (upcomingClosed) {
            upsell = { mode: 'upcoming_closed', cohort: upcomingClosed, progress: 0 };
          } else {
            // 6) Waitlist / open catalog fallback. `hasEnded` keeps a cohort
            // whose dates fully closed out of this suggestion even if its
            // `enrollment_disabled` flag was never flipped — a stale cohort
            // should never be surfaced as freshly open.
            const waitlist =
              catalog.find((c) => isWaitlist(c) && !enrolledIds.has(c.id) && !hasEnded(c)) ||
              catalog.find((c) => !c.enrollment_disabled && !enrolledIds.has(c.id) && !hasEnded(c)) ||
              null;
            if (waitlist) {
              // Only label it "upcoming" if the start date is genuinely in the future.
              // Otherwise it's a past/started cohort that still has open enrollment.
              const fallbackMode: SpotlightMode = isWaitlist(waitlist)
                ? 'waitlist'
                : isUpcomingDate(waitlist)
                  ? 'upcoming'
                  : 'open_enrollment';
              upsell = { mode: fallbackMode, cohort: waitlist, progress: 0 };
            }
          }
        }
      }

      // Dedup: don't repeat a cohort already shown in a personal card.
      if (upsell && personalCards.some((p) => p.cohort?.id === upsell?.cohort?.id)) {
        upsell = null;
      }

      // 7) Enrolled but between cohorts (upcoming/ended, not currently ongoing) and
      // nothing is open to join yet → nudge them to sign up once registration opens.
      // Learners actively in an ongoing cohort don't need this nudge.
      const hasOngoingPersonal = personalCards.some((p) => p.mode === 'ongoing');
      if (!upsell && personalCards.length > 0 && !hasOngoingPersonal) {
        upsell = { mode: 'signup_next', cohort: null, progress: 0 };
      }

      if (cancelled) return;

      const result = [...personalCards, upsell].filter((s): s is SpotlightState => s != null);
      setStates(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!states) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="hidden sm:block w-px bg-border" />
          <div className="flex items-center justify-center sm:w-36 shrink-0">
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (states.length === 0) {
    return <SignupNextCard />;
  }

  // Whichever card is for a cohort that hasn't started yet leads the row —
  // it's the most actionable/time-sensitive thing to show first.
  const orderedStates = [...states].sort((a, b) => {
    const aUpcoming = isUpcomingState(a);
    const bUpcoming = isUpcomingState(b);
    if (aUpcoming === bUpcoming) return 0;
    return aUpcoming ? -1 : 1;
  });

  return (
    <div className={cn('grid gap-3', orderedStates.length > 1 && 'sm:grid-cols-2')}>
      {orderedStates.map((state) => (
        <SpotlightCard key={`${state.mode}-${state.cohort?.id ?? 'none'}`} state={state} />
      ))}
    </div>
  );
}
