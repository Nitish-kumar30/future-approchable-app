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
  const notEnded = !c.end_date || c.end_date >= today;
  return started && notEnded;
}

function isUpcomingDate(c: Cohort): boolean {
  if (!c.start_date) return false;
  return c.start_date > todayIso();
}

function isJoinableUpcoming(c: Cohort): boolean {
  return isUpcomingDate(c) && !c.enrollment_disabled;
}

function isWaitlist(c: Cohort): boolean {
  return /waitlist/i.test(c.name || '');
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
  // Subtle highlight on the open-for-registration upsell — a soft accent tint,
  // not a loud banner, so it stands out without fighting the personal card.
  const isHighlighted = mode === 'upcoming';

  return (
    <Card
      className={cn(
        'card-elevated overflow-hidden',
        isHighlighted && 'border-accent/40 bg-accent/[0.04] shadow-[0_0_0_1px_hsl(var(--accent)/0.08)]',
      )}
    >
      <CardContent className="p-4 flex flex-col sm:flex-row items-stretch gap-4">
        <div className="min-w-0 space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="section-label">{sectionLabel}</p>
            {mode === 'enrolled_upcoming' && (
              <>
                <Badge variant="secondary" className="text-[10px] h-5">Upcoming</Badge>
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
                  isHighlighted && 'bg-accent/15 text-accent-foreground border border-accent/30',
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
  const { user } = useAuth();
  const [states, setStates] = useState<SpotlightState[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
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

      // ── Personal spotlight: the learner's own cohort status (at most one) ──
      let personal: SpotlightState | null = null;

      // 1) Enrolled in an ongoing cohort → spotlight + progress ring
      const ongoing = enrolled.find(isOngoing);
      if (ongoing) {
        const { data: percent } = await supabase.rpc('compute_enrollment_progress_percent', {
          p_user_id: user.id,
          p_cohort_id: ongoing.id,
        });
        if (cancelled) return;
        personal = { mode: 'ongoing', cohort: ongoing, progress: Number(percent) || 0 };
      }

      // 2) Enrolled in an upcoming cohort → your cohort, View details (never Register)
      if (!personal) {
        const enrolledUpcoming = enrolled
          .filter(isUpcomingDate)
          .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))[0];
        if (enrolledUpcoming) {
          personal = { mode: 'enrolled_upcoming', cohort: enrolledUpcoming, progress: 0 };
        }
      }

      // 3) Enrolled in a past/completed cohort — show their most recent one with progress ring
      if (!personal) {
        const enrolledCompleted = enrolled
          .filter((c) => c.end_date && c.end_date < todayIso())
          .sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''))[0];
        if (enrolledCompleted) {
          const { data: percent } = await supabase.rpc('compute_enrollment_progress_percent', {
            p_user_id: user.id,
            p_cohort_id: enrolledCompleted.id,
          });
          if (cancelled) return;
          personal = {
            mode: 'enrolled_completed',
            cohort: enrolledCompleted,
            progress: Number(percent) || 0,
          };
        }
      }

      // ── Upsell: always try to surface an open-to-register cohort, so it's ──
      // never hidden just because the learner already has a personal cohort.
      let upsell: SpotlightState | null = null;

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
          // 6) Waitlist / open catalog fallback
          const waitlist =
            catalog.find((c) => isWaitlist(c) && !enrolledIds.has(c.id)) ||
            catalog.find((c) => !c.enrollment_disabled && !enrolledIds.has(c.id)) ||
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

      // Dedup: don't repeat the same cohort the learner is already registered for.
      if (upsell && personal && upsell.cohort?.id === personal.cohort?.id) {
        upsell = null;
      }

      // 7) Enrolled but between cohorts (upcoming/ended, not currently ongoing) and
      // nothing is open to join yet → nudge them to sign up once registration opens.
      // Learners actively in an ongoing cohort don't need this nudge.
      if (!upsell && personal && personal.mode !== 'ongoing') {
        upsell = { mode: 'signup_next', cohort: null, progress: 0 };
      }

      if (cancelled) return;

      const result = [personal, upsell].filter((s): s is SpotlightState => s != null);
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

  return (
    <div className={cn('grid gap-3', states.length > 1 && 'sm:grid-cols-2')}>
      {states.map((state) => (
        <SpotlightCard key={`${state.mode}-${state.cohort?.id ?? 'none'}`} state={state} />
      ))}
    </div>
  );
}
