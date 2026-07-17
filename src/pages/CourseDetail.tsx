import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Markdown } from '@/components/ui/markdown';
import { SessionQuizList, SessionQuiz, QuizSubmission } from '@/components/session/SessionQuizList';
import PaymentButton from '@/components/payment/PaymentButton';
import { isPaidCourse } from '@/lib/coursePayment';
import CourseContentAccordion, { CurriculumSession } from '@/components/course/CourseContentAccordion';
import StickyPayBar from '@/components/course/StickyPayBar';
import { 
  Clock, 
  GraduationCap, 
  ArrowLeft,
  Video,
  FileText,
  CheckCircle2,
  Loader2,
  ClipboardList,
  BookOpen,
  ExternalLink,
  Lock
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

interface CourseQuiz {
  id: string;
  title: string;
}

interface PreReadingMaterial {
  id: string;
  session_id: string;
  title: string;
  link: string;
  display_order: number;
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<Record<string, SessionQuiz[]>>({});
  const [courseQuizzes, setCourseQuizzes] = useState<CourseQuiz[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [preReadingMaterials, setPreReadingMaterials] = useState<PreReadingMaterial[]>([]);
  const [completedChapterIds, setCompletedChapterIds] = useState<Set<string>>(new Set());
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [curriculumSessions, setCurriculumSessions] = useState<CurriculumSession[]>([]);

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
        setCourseQuizzes(courseQuizzesData);
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
          const quizzesMap: Record<string, SessionQuiz[]> = {};
          
          sessionQuizzesData.forEach((sq: any) => {
            if (sq.quiz) {
              const quiz = sq.quiz;
              allQuizIds.push(quiz.id);
              
              if (!quizzesMap[sq.session_id]) {
                quizzesMap[sq.session_id] = [];
              }
              
              const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
              quizzesMap[sq.session_id].push({
                id: quiz.id,
                title: quiz.title,
                questionCount: questions.length,
                displayOrder: sq.display_order
              });
            }
          });
          
          setSessionQuizzes(quizzesMap);
        }

        // Fetch pre-reading materials
        const { data: materialsData } = await supabase
          .from('pre_reading_materials')
          .select('*')
          .in('session_id', sessionIds)
          .order('display_order', { ascending: true });
        
        if (materialsData) {
          setPreReadingMaterials(materialsData);
        }

      }

      // Fetch quiz submissions for the user
      if (allQuizIds.length > 0) {
        const { data: submissionsData } = await supabase
          .from('quiz_submissions')
          .select('quiz_id, score, submitted_at')
          .eq('user_id', user?.id)
          .in('quiz_id', allQuizIds)
          .order('submitted_at', { ascending: false });
        
        if (submissionsData) {
          // Keep only latest submission per quiz
          const latestSubmissions = new Map<string, QuizSubmission>();
          submissionsData.forEach((s: any) => {
            if (!latestSubmissions.has(s.quiz_id)) {
              latestSubmissions.set(s.quiz_id, {
                quizId: s.quiz_id,
                score: s.score || 0,
                submittedAt: s.submitted_at
              });
            }
          });
          setQuizSubmissions(Array.from(latestSubmissions.values()));
        }
      }
    }
  };

  const handlePaymentSuccess = () => {
    setHasPaid(true);
    setIsEnrolled(true);
    if (course) {
      checkEnrollment(course.id);
      fetchSessions(course.id);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
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

  const getQuizzesForSession = (sessionId: string): SessionQuiz[] => 
    sessionQuizzes[sessionId] || [];

  const getMaterialsForSession = (sessionId: string) => 
    preReadingMaterials.filter(m => m.session_id === sessionId);

  const totalChapters = useMemo(
    () => curriculumSessions.reduce((n, s) => n + s.chapters.length, 0),
    [curriculumSessions],
  );
  const completedChapters = useMemo(
    () =>
      curriculumSessions.reduce(
        (n, s) => n + s.chapters.filter((c) => completedChapterIds.has(c.id)).length,
        0,
      ),
    [curriculumSessions, completedChapterIds],
  );
  const overallProgress =
    totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Course not found</h2>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </Button>

        {/* Course Image */}
        {course.image_url && (
          <div ref={heroRef} className="relative w-full aspect-[5/2] md:aspect-[8/3] rounded-xl overflow-hidden bg-muted">
            <img
              src={course.image_url}
              alt={course.name}
              className="w-full h-full object-cover object-center"
            />
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-foreground">
                {course.name}
              </h1>
              {course.mentor_name && (
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  By {course.mentor_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isEnrolled ? (
                <>
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Enrolled
                  </Badge>
                  <Button size="lg" onClick={() => navigate(`/courses/${slug}/learn`)}>
                    Continue learning
                  </Button>
                </>
              ) : course.enrollment_disabled ? (
                <Badge variant="secondary" className="text-base px-4 py-2">
                  Enrollment Closed
                </Badge>
              ) : course && isPaidCourse(course) && !isAdmin ? (
                <PaymentButton
                  courseId={course.id}
                  courseName={course.name}
                  priceInrPaise={course.price_inr_paise}
                  priceUsdCents={course.price_usd_cents}
                  hasPaid={hasPaid}
                  onPaid={handlePaymentSuccess}
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
              )}
            </div>
          </div>

          {/* Meta Info */}
          {course.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {course.duration}
            </div>
          )}
        </div>

        <Separator />

        {/* Overall Progress - Only for enrolled users */}
        {isEnrolled && totalChapters > 0 && (
          <Card className="card-elevated border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedChapters} of {totalChapters} lessons completed
                  </span>
                  <span className="font-medium">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>About this Course</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown content={course.description || 'No description available.'} />
            {course.mentor_info && (
              <div className="mt-6">
                <h4 className="text-foreground font-semibold mb-2">About the Instructor</h4>
                <Markdown content={course.mentor_info} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course-Level Quizzes */}
        {isEnrolled && courseQuizzes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Course Assessments</h2>
            <div className="flex flex-wrap gap-2">
              {courseQuizzes.map(quiz => (
                <Button 
                  key={quiz.id} 
                  variant="outline"
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  {quiz.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Course Content */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Course Content</h2>
          {curriculumSessions.length === 0 ? (
            <Card className="card-elevated border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No content available yet.
              </CardContent>
            </Card>
          ) : (
            <CourseContentAccordion
              slug={slug!}
              isEnrolled={isEnrolled}
              sessions={curriculumSessions}
            />
          )}

        </div>
      </div>
    </MainLayout>
  );
}
