import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/layout/AppShell';
import FreeCoursesGrid from '@/components/courses/FreeCoursesGrid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  Check,
  Clock,
  Calendar,
  GraduationCap,
  ArrowRight,
  Image as ImageIcon,
  Search,
  ListFilter,
} from 'lucide-react';
import { formatDuration } from '@/lib/formatDuration';

interface Course {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
  start_date?: string | null;
  enrollment_disabled?: boolean;
  is_on_demand?: boolean;
  price_inr_paise?: number | null;
  price_usd_cents?: number | null;
}

interface MyCourse extends Course {
  percent: number;
}

type TabValue = 'courses' | 'free' | 'my';
type SortOption = 'newest' | 'name-asc';
type PriceFilter = 'all' | 'paid' | 'free';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  'name-asc': 'Name (A–Z)',
};

function sortCourses<T extends { name: string; duration: string | null; start_date?: string | null }>(
  courses: T[],
  sort: SortOption,
): T[] {
  const sorted = [...courses];
  if (sort === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort(
      (a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime(),
    );
  }
  return sorted;
}

function CourseGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="card-elevated overflow-hidden flex flex-col">
          <Skeleton className="h-36 w-full shrink-0 rounded-none" />
          <CardHeader className="p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full mt-2" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function CourseCard({
  course,
  enrolled,
  percent,
  href,
  ctaLabel,
}: {
  course: Course;
  enrolled: boolean;
  percent?: number;
  /** Overrides the default details-page link, e.g. to jump straight into a lesson. */
  href?: string;
  /** Overrides the default "View details" ghost button with a primary CTA. */
  ctaLabel?: string;
}) {
  return (
    <Link to={href ?? `/courses/${course.slug}`}>
      <Card className="relative card-elevated hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col h-full">
        <div className="relative h-36 shrink-0 bg-muted overflow-hidden">
          {course.image_url ? (
            <img
              src={course.image_url}
              alt={course.name}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          {enrolled ? (
            <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">
              Enrolled
            </Badge>
          ) : course.enrollment_disabled ? (
            <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">
              Closed
            </Badge>
          ) : null}
        </div>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
            {course.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-xs">{course.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 pb-4 space-y-2 mt-auto">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {course.mentor_name && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {course.mentor_name}
              </span>
            )}
            {course.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(course.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {course.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(course.duration)}
              </span>
            )}
          </div>
          <div className="flex justify-end">
            {ctaLabel ? (
              <Button size="sm" className="h-8 text-xs">
                {ctaLabel}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                View details <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>

        {/* Progress line at the true bottom edge of the card — only for enrolled courses with tracked progress */}
        {enrolled && percent != null && (
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        )}
      </Card>
    </Link>
  );
}

export default function Courses() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabValue = tabParam === 'my' || tabParam === 'free' ? tabParam : 'courses';

  const [paidCourses, setPaidCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(true);
  const [loadingMy, setLoadingMy] = useState(true);
  const [freeCount, setFreeCount] = useState(0);
  const [loadingFree, setLoadingFree] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPaid(true);
      const { data } = await supabase
        .from('courses')
        .select(
          'id, slug, name, description, mentor_name, duration, image_url, start_date, enrollment_disabled, price_inr_paise, price_usd_cents',
        )
        .eq('is_published', true)
        .eq('is_on_demand', false)
        .order('start_date', { ascending: false });
      if (!cancelled) {
        setPaidCourses(data || []);
        setLoadingPaid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_on_demand', true);
      if (!cancelled) {
        setFreeCount(count || 0);
        setLoadingFree(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoadingMy(true);
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(
          'course_id, courses (id, slug, name, description, mentor_name, duration, image_url, is_on_demand, price_inr_paise, price_usd_cents)',
        )
        .eq('user_id', user.id)
        .not('course_id', 'is', null);

      if (cancelled) return;

      const ids = (enrollments || []).map((e) => e.course_id as string);
      setEnrolledIds(ids);

      const courses = (enrollments || [])
        .map((e) => e.courses as unknown as Course | null)
        .filter((c): c is Course => !!c);

      const withProgress = await Promise.all(
        courses.map(async (course) => {
          const { data: percent } = await supabase.rpc('compute_enrollment_progress_percent', {
            p_user_id: user.id,
            p_course_id: course.id,
          });
          return { ...course, percent: Number(percent) || 0 };
        }),
      );

      if (!cancelled) {
        setMyCourses(withProgress);
        setLoadingMy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);
  const progressByCourseId = useMemo(
    () => new Map(myCourses.map((c) => [c.id, c.percent])),
    [myCourses],
  );

  // "My Courses" should feel intentional: instructor-led enrollments always
  // belong here (registration is a real commitment), but free/on-demand
  // courses only show up once the learner has actually started them —
  // otherwise every free course they've merely viewed would clutter this tab.
  const myCoursesFiltered = useMemo(
    () => myCourses.filter((c) => !c.is_on_demand || c.percent > 0),
    [myCourses],
  );

  const matchesSearch = (c: { name: string; description: string | null }) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
    );
  };

  const matchesPrice = (c: { price_inr_paise?: number | null; price_usd_cents?: number | null }) => {
    if (priceFilter === 'all') return true;
    const isPaid = !!(c.price_inr_paise || c.price_usd_cents);
    return priceFilter === 'paid' ? isPaid : !isPaid;
  };

  const visiblePaidCourses = useMemo(
    () => sortCourses(paidCourses.filter((c) => matchesSearch(c) && matchesPrice(c)), sort),
    [paidCourses, search, sort, priceFilter],
  );
  const visibleMyCourses = useMemo(
    () => sortCourses(myCoursesFiltered.filter((c) => matchesSearch(c) && matchesPrice(c)), sort),
    [myCoursesFiltered, search, sort, priceFilter],
  );

  const onTabChange = (value: string) => {
    const next = value as TabValue;
    if (next === 'courses') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: next }, { replace: true });
    }
  };

  return (
    <AppShell>
      <div className="space-y-4 animate-fade-in">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-foreground">Courses</h2>
          <p className="text-sm text-muted-foreground">
            Instructor-led, free on-demand, and your enrolled courses.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <TabsList className="h-auto w-auto justify-start gap-7 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="courses"
                className="h-auto gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pt-1.5 pb-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 hover:border-muted-foreground/30 hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Courses
                {!loadingPaid && paidCourses.length > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {paidCourses.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="free"
                className="h-auto gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pt-1.5 pb-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 hover:border-muted-foreground/30 hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Free
                {!loadingFree && freeCount > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {freeCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="my"
                className="h-auto gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pt-1.5 pb-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors duration-200 hover:border-muted-foreground/30 hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                My Courses
                {!loadingMy && myCoursesFiltered.length > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {myCoursesFiltered.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
              <div className="relative flex-1 min-w-0 sm:w-64 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="h-9 pl-9 text-sm"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0">
                    <ListFilter className="h-3.5 w-3.5" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" collisionPadding={12} className="w-48">
                  <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={sort}
                    onValueChange={(value) => setSort(value as SortOption)}
                  >
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                      <DropdownMenuRadioItem key={option} value={option} className="text-xs">
                        {SORT_LABELS[option]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  {activeTab !== 'free' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onSelect={(e) => {
                          e.preventDefault();
                          setPriceFilter(priceFilter === 'paid' ? 'all' : 'paid');
                        }}
                      >
                        <Check
                          className={`mr-2 h-3.5 w-3.5 ${priceFilter === 'paid' ? 'opacity-100' : 'opacity-0'}`}
                        />
                        Paid
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onSelect={(e) => {
                          e.preventDefault();
                          setPriceFilter(priceFilter === 'free' ? 'all' : 'free');
                        }}
                      >
                        <Check
                          className={`mr-2 h-3.5 w-3.5 ${priceFilter === 'free' ? 'opacity-100' : 'opacity-0'}`}
                        />
                        Unpaid
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="-mt-[1px] border-b border-border" />

          <TabsContent value="courses" className="mt-4">
            {loadingPaid ? (
              <CourseGridSkeleton />
            ) : paidCourses.length === 0 ? (
              <Card className="card-elevated border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">No Courses Available</h3>
                  <p className="text-sm text-muted-foreground">Check back soon for new courses.</p>
                </CardContent>
              </Card>
            ) : visiblePaidCourses.length === 0 ? (
              <Card className="card-elevated border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">No matching courses</h3>
                  <p className="text-sm text-muted-foreground">Try a different search term.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {visiblePaidCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    enrolled={enrolledSet.has(course.id)}
                    percent={progressByCourseId.get(course.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="free" className="mt-4">
            <FreeCoursesGrid searchQuery={search} sort={sort} />
          </TabsContent>

          <TabsContent value="my" className="mt-4">
            {loadingMy ? (
              <CourseGridSkeleton />
            ) : myCoursesFiltered.length === 0 ? (
              <Card className="card-elevated border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">No enrolled courses</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Browse the catalog to start learning.
                  </p>
                  <Button size="sm" onClick={() => onTabChange('courses')}>
                    Browse courses
                  </Button>
                </CardContent>
              </Card>
            ) : visibleMyCourses.length === 0 ? (
              <Card className="card-elevated border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">No matching courses</h3>
                  <p className="text-sm text-muted-foreground">Try a different search term.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {visibleMyCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    enrolled
                    percent={course.percent}
                    href={
                      course.is_on_demand
                        ? `/on-demand/${course.slug}`
                        : `/courses/${course.slug}/learn`
                    }
                    ctaLabel={course.percent > 0 ? 'Resume' : 'Start'}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
