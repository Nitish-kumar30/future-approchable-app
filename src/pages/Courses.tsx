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
import {
  BookOpen,
  Clock,
  Calendar,
  GraduationCap,
  ArrowRight,
  Image as ImageIcon,
  PlayCircle,
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
}

interface MyCourse extends Course {
  percent: number;
}

type TabValue = 'courses' | 'free' | 'my';

function CourseGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="card-elevated overflow-hidden">
          <Skeleton className="h-32 w-full" />
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
      <Card className="relative card-elevated hover:shadow-md transition-all duration-200 cursor-pointer h-full group overflow-hidden">
        <div className="relative h-24 bg-muted overflow-hidden">
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
        <CardContent className="p-4 pt-0 space-y-2">
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
  const activeTab: TabValue =
    tabParam === 'free' || tabParam === 'my' ? tabParam : 'courses';

  const [paidCourses, setPaidCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(true);
  const [loadingMy, setLoadingMy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPaid(true);
      const { data } = await supabase
        .from('courses')
        .select(
          'id, slug, name, description, mentor_name, duration, image_url, start_date, enrollment_disabled',
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
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoadingMy(true);
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(
          'course_id, courses (id, slug, name, description, mentor_name, duration, image_url, is_on_demand)',
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
          <TabsList className="h-12 w-full max-w-xl p-1.5 gap-1 bg-muted/70">
            <TabsTrigger
              value="courses"
              className="flex-1 h-full text-sm gap-2 rounded-lg data-[state=active]:shadow-sm"
            >
              <BookOpen className="h-4 w-4" />
              Courses
              {!loadingPaid && paidCourses.length > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {paidCourses.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="free"
              className="flex-1 h-full text-sm gap-2 rounded-lg data-[state=active]:shadow-sm"
            >
              <PlayCircle className="h-4 w-4" />
              Free
            </TabsTrigger>
            <TabsTrigger
              value="my"
              className="flex-1 h-full text-sm gap-2 rounded-lg data-[state=active]:shadow-sm"
            >
              <GraduationCap className="h-4 w-4" />
              My Courses
              {!loadingMy && myCoursesFiltered.length > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {myCoursesFiltered.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

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
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {paidCourses.map((course) => (
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
            <FreeCoursesGrid />
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
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {myCoursesFiltered.map((course) => (
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
