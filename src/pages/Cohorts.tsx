import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Calendar, GraduationCap, ArrowRight } from 'lucide-react';
import { formatCohortDateRange } from '@/lib/formatCohortDate';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  max_seats: number | null;
  session_time: string | null;
  enrollment_disabled: boolean;
}

/**
 * Which section a cohort belongs to. "Past" means the opportunity is actually
 * gone; a cohort whose printed dates ended but that still accepts new
 * registrations is "Open Enrollment", not "Past" — those are different facts.
 */
type DateCategory = 'Ongoing' | 'Upcoming' | 'Open Enrollment' | 'Past';

/** The learner's relationship to the cohort — independent of its category. */
type EnrollmentStatus = 'Completed' | 'Enrolled' | 'Open' | 'Closed';

interface CohortListItem {
  cohort: Cohort;
  category: DateCategory;
  status: EnrollmentStatus;
  isEnrolled: boolean;
  enrollmentCount: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function isWithinRunningWindow(cohort: Cohort, today: string): boolean {
  if (!cohort.start_date) return false;
  const started = cohort.start_date <= today;
  const notEnded = !cohort.end_date || cohort.end_date >= today;
  return started && notEnded;
}

/**
 * Category depends on whether the viewer is enrolled:
 * - Enrolled: their cohort is Ongoing / Upcoming / Past based purely on dates
 *   (whether new people can still register doesn't matter to them anymore).
 * - Not enrolled: a cohort whose dates ended is only "Past" if registration
 *   is actually closed. If it's still open, it belongs in "Open Enrollment".
 */
function deriveCategory(cohort: Cohort, isEnrolled: boolean): DateCategory {
  const today = todayIso();

  if (isWithinRunningWindow(cohort, today)) return 'Ongoing';
  if (!cohort.start_date || cohort.start_date > today) return 'Upcoming';

  // At this point the cohort's window has ended (end_date < today).
  if (isEnrolled) return 'Past';
  return cohort.enrollment_disabled ? 'Past' : 'Open Enrollment';
}

function deriveStatus(
  cohort: Cohort,
  isEnrolled: boolean,
  progressPercent: number | null,
): EnrollmentStatus {
  if (isEnrolled) {
    return progressPercent != null && progressPercent >= 100 ? 'Completed' : 'Enrolled';
  }
  return cohort.enrollment_disabled ? 'Closed' : 'Open';
}

function statusVariant(status: EnrollmentStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'Enrolled') return 'default';
  if (status === 'Completed' || status === 'Open') return 'secondary';
  return 'outline';
}

const CATEGORY_META: Record<DateCategory, { label: string }> = {
  Ongoing: { label: 'Ongoing Cohorts' },
  Upcoming: { label: 'Upcoming Cohorts' },
  'Open Enrollment': { label: 'Open Enrollment' },
  Past: { label: 'Past Cohorts' },
};

function CohortCard({ item }: { item: CohortListItem }) {
  const { cohort, category, status, isEnrolled, enrollmentCount } = item;
  // "Open Enrollment" cohorts have already run their dates — the DB flag says
  // registration is technically open, but offering "Register" for something
  // that already happened is misleading, so treat it like registration is closed.
  const isRegistrationClosed = cohort.enrollment_disabled || category === 'Open Enrollment';

  return (
    <Link to={`/cohorts/${cohort.id}`} className="h-full block">
      <Card className="card-elevated hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col group">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              {cohort.name}
            </CardTitle>
            <Badge variant={statusVariant(status)} className="shrink-0 text-[10px] h-5">
              {status}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2 text-xs">
            {cohort.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {cohort.mentor_name && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {cohort.mentor_name}
              </span>
            )}
            {(cohort.start_date || cohort.session_time) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatCohortDateRange(cohort.start_date, cohort.end_date, cohort.session_time)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-1">
            {!isEnrolled && !isRegistrationClosed && cohort.max_seats ? (
              <span className="text-[11px] text-muted-foreground">
                {cohort.max_seats - enrollmentCount > 0
                  ? `${cohort.max_seats - enrollmentCount} seats left`
                  : 'Fully booked'}
              </span>
            ) : (
              <span />
            )}
            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs ml-auto">
              {isEnrolled ? 'Open' : isRegistrationClosed ? 'View details' : 'Register'}{' '}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Cohorts() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<CohortListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    let cancelled = false;

    (async () => {
      // Admins query cohorts table directly (sees unpublished too);
      // regular users query the published-only view
      const catalogQuery = isAdmin
        ? supabase
            .from('cohorts')
            .select(
              'id, name, description, mentor_name, start_date, end_date, max_seats, session_time, enrollment_disabled',
            )
            .order('start_date', { ascending: false })
        : supabase
            .from('cohorts_public' as any)
            .select(
              'id, name, description, mentor_name, start_date, end_date, max_seats, session_time, enrollment_disabled',
            )
            .order('start_date', { ascending: false });

      const [{ data: enrolledRows }, { data: publicRows }] = await Promise.all([
        supabase
          .from('enrollments')
          .select(
            `
            cohort_id,
            cohorts (
              id, name, description, mentor_name, start_date, end_date, max_seats, session_time, enrollment_disabled
            )
          `,
          )
          .eq('user_id', user.id)
          .not('cohort_id', 'is', null),
        catalogQuery,
      ]);

      if (cancelled) return;

      const enrolledMap = new Map<string, Cohort>();
      for (const row of enrolledRows || []) {
        const c = row.cohorts as unknown as Cohort | null;
        if (c) enrolledMap.set(c.id, c);
      }

      const catalog = (publicRows || []) as unknown as Cohort[];

      // Hydrate enrolled cohorts from catalog if the join returned null
      const catalogById = new Map(catalog.map((c) => [c.id, c]));
      for (const row of enrolledRows || []) {
        const joined = row.cohorts as unknown as Cohort | null;
        const id = joined?.id || (row.cohort_id as string | null);
        if (!id) continue;
        if (!enrolledMap.has(id)) {
          const cohort = joined || catalogById.get(id);
          if (cohort) enrolledMap.set(id, cohort);
        }
      }

      // Non-enrolled cohorts show up in every category except Past — a user
      // who was never part of a cohort shouldn't see it cluttering "Past
      // Cohorts". Admins are exempt: they need full oversight of every past
      // cohort regardless of their own enrollment.
      const others = catalog.filter(
        (c) => !enrolledMap.has(c.id) && (isAdmin || deriveCategory(c, false) !== 'Past'),
      );

      const candidateIds = [
        ...Array.from(enrolledMap.keys()),
        ...others.map((c) => c.id),
      ];

      const progressById = new Map<string, number>();
      const counts: Record<string, number> = {};

      await Promise.all([
        ...Array.from(enrolledMap.keys()).map(async (cohortId) => {
          const { data } = await supabase.rpc('compute_enrollment_progress_percent', {
            p_user_id: user.id,
            p_cohort_id: cohortId,
          });
          progressById.set(cohortId, Number(data) || 0);
        }),
        ...candidateIds.map(async (cohortId) => {
          const { data } = await supabase.rpc('get_cohort_enrollment_count', {
            _cohort_id: cohortId,
          });
          counts[cohortId] = data || 0;
        }),
      ]);

      if (cancelled) return;

      const list: CohortListItem[] = [
        ...Array.from(enrolledMap.values()).map((cohort) => {
          const progress = progressById.get(cohort.id) ?? null;
          return {
            cohort,
            category: deriveCategory(cohort, true),
            status: deriveStatus(cohort, true, progress),
            isEnrolled: true,
            enrollmentCount: counts[cohort.id] || 0,
          };
        }),
        ...others.map((cohort) => ({
          cohort,
          category: deriveCategory(cohort, false),
          status: deriveStatus(cohort, false, null),
          isEnrolled: false,
          enrollmentCount: counts[cohort.id] || 0,
        })),
      ];

      // Sort within each category by relevance: Upcoming soonest-first,
      // everything else (Ongoing/Open Enrollment/Past) most-recent-first.
      list.sort((a, b) => {
        const aDate = a.cohort.start_date || '';
        const bDate = b.cohort.start_date || '';
        if (a.category === 'Upcoming') return aDate.localeCompare(bDate);
        return bDate.localeCompare(aDate);
      });

      setItems(list);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  const categoryOrder: DateCategory[] = ['Ongoing', 'Upcoming', 'Open Enrollment', 'Past'];
  const grouped = categoryOrder.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-foreground">Cohorts</h2>
          <p className="text-sm text-muted-foreground">
            All cohort programs — ongoing, upcoming, and past.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-elevated">
                <CardHeader className="p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full mt-2" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="card-elevated border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold mb-1">No cohorts yet</h3>
              <p className="text-sm text-muted-foreground">
                Check back soon for upcoming cohort programs.
              </p>
            </CardContent>
          </Card>
        ) : (
          grouped
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.category} className="space-y-3">
                <h3 className="text-base font-display font-bold text-foreground">
                  {CATEGORY_META[group.category].label}
                </h3>
                <div className="grid gap-3 items-stretch md:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <CohortCard key={item.cohort.id} item={item} />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </AppShell>
  );
}
