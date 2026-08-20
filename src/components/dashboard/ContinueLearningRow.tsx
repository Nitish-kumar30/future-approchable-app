import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ArrowRight } from 'lucide-react';
import { fetchOnDemandLearningItems } from '@/lib/onDemandProgress';

interface LearningItem {
  courseId: string;
  slug: string;
  name: string;
  percent: number;
  lastChapterTitle: string | null;
  resumeSessionId: string | null;
  isOnDemand: boolean;
}

function onDemandResumeHref(slug: string, resumeSessionId: string | null): string {
  const base = `/on-demand/${slug}`;
  return resumeSessionId ? `${base}?session=${resumeSessionId}` : base;
}

interface EnrolledCourse {
  id: string;
  slug: string;
  name: string;
  is_on_demand: boolean | null;
}

export default function ContinueLearningRow() {
  const { user } = useAuth();
  const [items, setItems] = useState<LearningItem[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses (id, slug, name, is_on_demand)')
        .eq('user_id', user.id)
        .not('course_id', 'is', null);

      if (cancelled) return;

      const courses = (enrollments || [])
        .map((e) => e.courses as unknown as EnrolledCourse | null)
        .filter((c): c is EnrolledCourse => !!c);

      if (courses.length === 0) {
        setItems([]);
        return;
      }

      const structuredCourses = courses.filter((c) => !c.is_on_demand);
      const onDemandCourses = courses.filter((c) => c.is_on_demand);
      const structuredCourseIds = new Set(structuredCourses.map((c) => c.id));

      const [{ data: progressRows }, structuredPercents, onDemandItems] = await Promise.all([
        structuredCourses.length > 0
          ? supabase
              .from('chapter_progress')
              .select('updated_at, chapters (title, sessions (course_id))')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] as { updated_at: string; chapters: unknown }[] }),
        Promise.all(
          structuredCourses.map(async (course) => {
            const { data: percent } = await supabase.rpc('compute_enrollment_progress_percent', {
              p_user_id: user.id,
              p_course_id: course.id,
            });
            return { courseId: course.id, percent: Number(percent) || 0 };
          }),
        ),
        onDemandCourses.length > 0
          ? fetchOnDemandLearningItems(user.id, onDemandCourses)
          : Promise.resolve([] as LearningItem[]),
      ]);

      if (cancelled) return;

      const percentByCourse = new Map(structuredPercents.map((p) => [p.courseId, p.percent]));
      const lastChapterByCourse = new Map<string, string>();

      for (const row of progressRows || []) {
        const chapter = row.chapters as unknown as {
          title: string;
          sessions: { course_id: string | null } | null;
        } | null;
        const courseId = chapter?.sessions?.course_id;
        if (!courseId || !structuredCourseIds.has(courseId) || lastChapterByCourse.has(courseId))
          continue;
        lastChapterByCourse.set(courseId, chapter!.title);
      }

      const structuredItems: LearningItem[] = structuredCourses.map((course) => ({
        courseId: course.id,
        slug: course.slug,
        name: course.name,
        percent: percentByCourse.get(course.id) ?? 0,
        lastChapterTitle: lastChapterByCourse.get(course.id) ?? null,
        resumeSessionId: null,
        isOnDemand: false,
      }));

      // Show every enrolled/started course that isn't finished yet — paid or free.
      const learningItems = [...structuredItems, ...onDemandItems].filter(
        (item) => item.percent < 100,
      );

      setItems(learningItems);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (items === null) {
    return (
      <div className="space-y-2">
        <p className="section-label">Continue learning</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="card-elevated">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <p className="section-label">Continue learning</p>
        <Card className="card-elevated border-dashed">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No courses in progress</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enroll in a course to pick up where you left off.
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/courses">
                Browse courses <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="section-label">Continue learning</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.courseId} className="card-elevated">
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                  {item.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {item.lastChapterTitle ? `Last: ${item.lastChapterTitle}` : 'Ready to start'}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Progress</span>
                  <span className="tabular-nums font-medium text-foreground">{item.percent}%</span>
                </div>
                <Progress value={item.percent} className="h-1.5" />
              </div>
              <Button size="sm" className="h-8 text-xs w-full sm:w-auto" asChild>
                <Link
                  to={
                    item.isOnDemand
                      ? onDemandResumeHref(item.slug, item.resumeSessionId)
                      : `/courses/${item.slug}/learn`
                  }
                >
                  Resume
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
