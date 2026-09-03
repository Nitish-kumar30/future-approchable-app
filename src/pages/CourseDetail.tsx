import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildLoginUrl } from '@/lib/authRedirect';
import { useToast } from '@/hooks/use-toast';
import { usePricingCurrency } from '@/hooks/usePricingCurrency';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Markdown } from '@/components/ui/markdown';
import PaymentButton from '@/components/payment/PaymentButton';
import { isPaidCourse } from '@/lib/coursePayment';
import { CurriculumSession } from '@/components/course/CourseContentAccordion';
import StickyPayBar from '@/components/course/StickyPayBar';
import CertificatePanel from '@/components/certificate/CertificatePanel';
import CourseHero from '@/components/course/detail/CourseHero';
import CourseInfoRail from '@/components/course/detail/CourseInfoRail';
import CourseCurriculumSection from '@/components/course/detail/CourseCurriculumSection';
import InstructorCard from '@/components/course/detail/InstructorCard';
import CourseReviews from '@/components/course/detail/CourseReviews';
import RelatedCourses from '@/components/course/detail/RelatedCourses';
import { buildIncludesLabels } from '@/components/course/detail/courseIncludes';
import {
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  mentor_info: string | null;
  duration: string | null;
  image_url: string | null;
  enrollment_disabled: boolean;
  price_inr_paise?: number | null;
  price_usd_cents?: number | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_date: string | null;
  recording_url: string | null;
  presentation_url: string | null;
  session_order: number;
  is_content_unlocked?: boolean;
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { coursePriceLabel } = usePricingCurrency();

  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ratingSummary, setRatingSummary] = useState<{ avg: number; count: number } | null>(null);
  const [completedChapterIds, setCompletedChapterIds] = useState<Set<string>>(new Set());
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [curriculumSessions, setCurriculumSessions] = useState<CurriculumSession[]>([]);
  const [quizSubmissionQuizIds, setQuizSubmissionQuizIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (slug) {
      fetchCourse();
    }
  }, [slug, user]);

  useEffect(() => {
    if (isEnrolled && course && user) {
      fetchEnrolledContent(course.id);
    }
  }, [isEnrolled, course, user]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-course-curriculum?slug=${encodeURIComponent(slug)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setCurriculumSessions(data.sessions || []);
        }
      } catch (e) {
        console.error('Failed to fetch curriculum:', e);
      }
    })();
  }, [slug, user, isEnrolled]);

  useEffect(() => {
    if (!isEnrolled || !user || curriculumSessions.length === 0) {
      setCompletedChapterIds(new Set());
      return;
    }
    const chapterIds = curriculumSessions.flatMap((s) => s.chapters.map((c) => c.id));
    if (chapterIds.length === 0) return;

    (async () => {
      const { data } = await supabase
        .from('chapter_progress')
        .select('chapter_id')
        .eq('user_id', user.id)
        .in('chapter_id', chapterIds)
        .eq('is_completed', true);

      setCompletedChapterIds(new Set((data ?? []).map((p) => p.chapter_id)));
    })();
  }, [isEnrolled, user, curriculumSessions]);

  useEffect(() => {
    if (!course) return;
    (async () => {
      const { data } = await supabase
        .from('course_ratings')
        .select('rating')
        .eq('course_id', course.id);
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setRatingSummary({ avg, count: data.length });
      } else {
        setRatingSummary(null);
      }
    })();
  }, [course]);

  const fetchCourse = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', slug!)
      .single();

    if (!error && data) {
      setCourse(data);
      // Now fetch sessions and enrollment using the course id
      fetchSessions(data.id);
      if (user) {
        checkEnrollment(data.id);
        if (isPaidCourse(data)) checkPaymentStatus(data.id);
      } else {
        setHasPaid(false);
      }
    }
    setIsLoading(false);
  };

  const checkEnrollment = async (courseId: string) => {
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user?.id)
      .eq('course_id', courseId)
      .maybeSingle();

    setIsEnrolled(!!data);
  };

  const checkPaymentStatus = async (courseId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', user!.id)
      .eq('course_id', courseId)
      .eq('status', 'paid')
      .maybeSingle();

    setHasPaid(!!data);
  };

  const fetchSessions = async (courseId: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-sessions?course_id=${courseId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSessions((data.sessions || []) as Session[]);
      }
    } catch (e) {
      console.error('Failed to fetch public sessions:', e);
    }
  };

  const fetchEnrolledContent = async (courseId: string) => {
    // Re-fetch sessions with full data for enrolled users
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('session_order', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData);

      const sessionIds = sessionsData.map(s => s.id);
      const allQuizIds: string[] = [];

      // Fetch course-level quizzes (direct assignment)
      const { data: courseQuizzesData } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('course_id', courseId)
        .is('session_id', null);

      if (courseQuizzesData) {
        allQuizIds.push(...courseQuizzesData.map(q => q.id));
      }

      if (sessionIds.length > 0) {
        // Fetch quizzes via session_quizzes junction table
        const { data: sessionQuizzesData } = await supabase
          .from('session_quizzes')
          .select(`
            session_id,
            display_order,
            quiz:quizzes (
              id,
              title,
              questions
            )
          `)
          .in('session_id', sessionIds)
          .order('display_order', { ascending: true });

        if (sessionQuizzesData) {
          sessionQuizzesData.forEach((sq: any) => {
            if (sq.quiz) allQuizIds.push(sq.quiz.id);
          });
        }
      }

      // Fetch quiz submissions for the user
      if (allQuizIds.length > 0) {
        const { data: submissionsData } = await supabase
          .from('quiz_submissions')
          .select('quiz_id')
          .eq('user_id', user?.id)
          .in('quiz_id', allQuizIds);

        if (submissionsData) {
          setQuizSubmissionQuizIds(new Set(submissionsData.map((s: any) => s.quiz_id)));
        }
      }
    }
  };

  const handlePaymentSuccess = () => {
    setHasPaid(true);
    setIsEnrolled(true);
    if (slug) {
      navigate(`/courses/${slug}/learn`);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate(buildLoginUrl(location.pathname + location.search));
      return;
    }

    setIsEnrolling(true);
    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: course?.id,
      });

    setIsEnrolling(false);

    if (error) {
      toast({
        title: 'Enrollment failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setIsEnrolled(true);
      toast({
        title: 'Successfully enrolled!',
        description: `You're now enrolled in ${course?.name}`,
      });
      if (course) fetchSessions(course.id);
    }
  };

  const totalChapters = useMemo(
    () => curriculumSessions.reduce((n, s) => n + s.chapters.length, 0),
    [curriculumSessions],
  );
  const totalQuizzes = useMemo(
    () => curriculumSessions.reduce((n, s) => n + s.quizzes.length, 0),
    [curriculumSessions],
  );
  const totalPreReadings = useMemo(
    () => curriculumSessions.reduce((n, s) => n + (s.pre_readings?.length ?? 0), 0),
    [curriculumSessions],
  );
  const completedQuizIds = useMemo(() => {
    const allQuizIds = new Set(curriculumSessions.flatMap((s) => s.quizzes.map((q) => q.id)));
    return new Set([...quizSubmissionQuizIds].filter((id) => allQuizIds.has(id)));
  }, [curriculumSessions, quizSubmissionQuizIds]);
  const totalItems = totalChapters + totalQuizzes;
  const completedItems = completedChapterIds.size + completedQuizIds.size;
  const overallProgress =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (isLoading) {
    return (
      <AppShell>
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="aspect-[16/9] sm:aspect-[5/2] md:aspect-[8/3] w-full rounded-xl" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="hidden lg:block h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Course not found</h2>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </AppShell>
    );
  }

  const paid = isPaidCourse(course);
  const showStickyBar = !isEnrolled && !course.enrollment_disabled;

  const ctaSlot = isEnrolled ? (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge variant="secondary" className="text-sm px-3 py-1.5">
        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Enrolled
      </Badge>
      <Button size="lg" onClick={() => navigate(`/courses/${slug}/learn`)}>
        Continue learning
      </Button>
    </div>
  ) : course.enrollment_disabled ? (
    <Badge variant="secondary" className="text-sm px-4 py-2">
      Enrollment Closed
    </Badge>
  ) : paid ? (
    <PaymentButton
      courseId={course.id}
      courseName={course.name}
      priceInrPaise={course.price_inr_paise}
      priceUsdCents={course.price_usd_cents}
      hasPaid={hasPaid}
      onPaid={handlePaymentSuccess}
      adminEnroll={
        isAdmin
          ? { onEnroll: handleEnroll, isEnrolling }
          : undefined
      }
    />
  ) : (
    <Button size="lg" onClick={handleEnroll} disabled={isEnrolling}>
      {isEnrolling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enrolling...
        </>
      ) : (
        'Enroll Now'
      )}
    </Button>
  );

  return (
    <AppShell>
      <div className="animate-fade-in grid lg:grid-cols-[1fr_360px] gap-x-8 gap-y-6 items-start">
        {/* ── Left column ── */}
        <div className="space-y-8 min-w-0">
          <CourseHero
            heroRef={heroRef}
            imageUrl={course.image_url}
            name={course.name}
            mentorName={course.mentor_name}
            duration={course.duration}
            sessionCount={curriculumSessions.length}
            chapterCount={totalChapters}
            isPaid={paid}
            priceLabel={coursePriceLabel(course)}
            rating={ratingSummary}
          />

          {/* Mobile-only price/CTA card — desktop shows the sticky rail instead */}
          <Card className="card-elevated lg:hidden">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                {!paid ? (
                  <p className="text-lg font-display font-bold text-success">Free</p>
                ) : (
                  <p className="text-lg font-display font-bold text-foreground">
                    {coursePriceLabel(course)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {paid ? 'One-time payment · Lifetime access' : 'Lifetime access'}
                </p>
              </div>
              <div>{ctaSlot}</div>
            </CardContent>
          </Card>

          {isEnrolled && totalItems > 0 && (
            <Card className="card-elevated border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {completedItems} of {totalItems} lessons & quizzes completed
                    </span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>
              </CardContent>
            </Card>
          )}

          {isEnrolled && paid && <CertificatePanel courseId={course.id} variant="course" />}

          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold">About this Course</h2>
            <Markdown content={course.description || 'No description available.'} />
          </div>

          {/* "What's included" lives in the desktop rail; surface the same list on mobile. */}
          <Card className="card-elevated lg:hidden">
            <CardContent className="p-4 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                This course includes
              </p>
              <ul className="space-y-2">
                {buildIncludesLabels({
                  chapterCount: totalChapters,
                  quizCount: totalQuizzes,
                  preReadingCount: totalPreReadings,
                  isPaid: paid,
                }).map((label, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <CourseCurriculumSection
            slug={slug!}
            isEnrolled={isEnrolled}
            sessions={curriculumSessions}
            completedChapterIds={completedChapterIds}
            completedQuizIds={completedQuizIds}
            chapterCount={totalChapters}
          />

          {course.mentor_name && (
            <InstructorCard mentorName={course.mentor_name} mentorInfo={course.mentor_info} />
          )}

          <CourseReviews courseId={course.id} />

          <RelatedCourses currentCourseId={course.id} />
        </div>

        {/* ── Right column: sticky info rail (desktop only) ── */}
        <div className="hidden lg:block sticky top-6">
          <CourseInfoRail
            priceLabel={coursePriceLabel(course)}
            isPaid={paid}
            isFree={!paid}
            chapterCount={totalChapters}
            quizCount={totalQuizzes}
            preReadingCount={totalPreReadings}
            isEnrolled={isEnrolled}
            overallProgress={overallProgress}
            completedItems={completedItems}
            totalItems={totalItems}
            ctaSlot={ctaSlot}
            courseName={course.name}
          />
        </div>
      </div>

      {showStickyBar && (
        <div className="lg:hidden">
          <StickyPayBar
            courseName={course.name}
            subtitle={paid ? 'One-time payment · Lifetime access' : 'Free · Lifetime access'}
            heroRef={heroRef}
            ctaSlot={ctaSlot}
          />
        </div>
      )}
    </AppShell>
  );
}
