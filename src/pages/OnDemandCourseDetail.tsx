import { useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildLoginUrl, courseDetailPath, onDemandCoursePath } from '@/lib/authRedirect';
import PublicHeader from '@/components/layout/PublicHeader';
import OnDemandVideoPlayer from '@/components/session/OnDemandVideoPlayer';
import InlineQuiz from '@/components/session/InlineQuiz';
import MentorshipUpsellModal from '@/components/session/MentorshipUpsellModal';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import {
  PlayCircle,
  FileText,
  ClipboardList,
  BookOpen,
  Lock,
  UserPlus,
  LogIn,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
  List,
} from 'lucide-react';
import FeedbackDialog from '@/components/FeedbackDialog';
import { Markdown } from '@/components/ui/markdown';
import { canEnrollInCourse } from '@/lib/coursePayment';
import { isVideoUrl } from '@/lib/recordingVideo';
import { getResumeSessionId } from '@/lib/onDemandProgress';

interface Course {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
  price_inr_paise?: number | null;
  price_usd_cents?: number | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  recording_url: string | null;
  presentation_url: string | null;
  session_order: number | null;
  text_content?: string | null;
  has_text_content?: boolean;
}

function sessionHasText(session: Session): boolean {
  return !!session.text_content?.trim() || !!session.has_text_content;
}

function getContentType(session: Session, hasQuizzes: boolean, hasReadings: boolean): string {
  if (session.recording_url && isVideoUrl(session.recording_url)) return 'video';
  if (sessionHasText(session)) return 'text';
  if (hasQuizzes) return 'quiz';
  if (session.presentation_url) return 'link';
  if (hasReadings) return 'reading';
  return 'content';
}

const contentIcons: Record<string, typeof PlayCircle> = {
  video: PlayCircle,
  text: FileText,
  quiz: ClipboardList,
  link: ExternalLink,
  reading: BookOpen,
  content: FileText,
};

function isTrackableOnDemandSession(
  session: Session,
  quizSessionIds: Set<string>,
): boolean {
  const hasVideo = !!(session.recording_url && isVideoUrl(session.recording_url));
  const hasText = sessionHasText(session);
  const hasQuizzes = quizSessionIds.has(session.id);
  return hasVideo || hasText || hasQuizzes;
}

interface SessionQuiz {
  quiz_id: string;
  quizzes: { id: string; title: string } | null;
}

interface PreReadingMaterial {
  id: string;
  title: string;
  link: string;
}

export default function OnDemandCourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<Record<string, SessionQuiz[]>>({});
  const [sessionReadings, setSessionReadings] = useState<Record<string, PreReadingMaterial[]>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedSessionIds, setCompletedSessionIds] = useState<Set<string>>(new Set());
  const [contentReady, setContentReady] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const enrolledContentLoadedRef2 = useRef(false);
  const initialSessionResolvedRef = useRef(false);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      enrolledContentLoadedRef2.current = false;
      initialSessionResolvedRef.current = false;
      setContentReady(false);
      setProgressLoaded(false);
      setActiveSessionId(null);
      fetchCourseData();
    }
  }, [slug]);

  // Fetch full session data (with URLs) when user authenticates and course is loaded
  useEffect(() => {
    if (user && course) {
      fetchEnrolledSessionData();
    }
  }, [user, course]);

  // Fetch existing progress when user logs in
  useEffect(() => {
    if (user && sessions.length > 0) {
      fetchProgress(sessions.map(s => s.id));
    }
  }, [user, sessions.length]);

  const fetchProgress = async (sessionIds: string[]) => {
    if (!user || sessionIds.length === 0) {
      setProgressLoaded(true);
      return;
    }
    const { data } = await supabase
      .from('session_progress')
      .select('session_id')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .in('session_id', sessionIds);

    if (data) {
      setCompletedSessionIds(new Set(data.map(p => p.session_id)));
    }
    setProgressLoaded(true);
  };

  // Resolve initial active session from ?session= deep link or first incomplete lesson.
  useEffect(() => {
    if (initialSessionResolvedRef.current || sessions.length === 0 || !contentReady) return;
    if (user && !progressLoaded) return;

    const quizSessionIds = new Set(
      Object.entries(sessionQuizzes)
        .filter(([, quizzes]) => quizzes.length > 0)
        .map(([sessionId]) => sessionId),
    );

    const qp = searchParams.get('session');
    const validQp = qp && sessions.some((s) => s.id === qp) ? qp : null;
    const resumeId = validQp ?? getResumeSessionId(sessions, completedSessionIds, quizSessionIds);

    setActiveSessionId(resumeId ?? sessions[0]?.id ?? null);
    initialSessionResolvedRef.current = true;

    if (validQp) {
      const next = new URLSearchParams(searchParams);
      next.delete('session');
      setSearchParams(next, { replace: true });
    }
  }, [
    sessions,
    completedSessionIds,
    user,
    contentReady,
    progressLoaded,
    sessionQuizzes,
    searchParams,
    setSearchParams,
  ]);

  const fetchCourseData = async () => {
    // First fetch the course by slug
    const courseRes = await supabase.from('courses').select('id, name, description, mentor_name, duration, image_url, price_inr_paise, price_usd_cents').eq('slug', slug!).single();

    if (!courseRes.data) { setIsLoading(false); return; }
    const courseData = courseRes.data;
    setCourse(courseData);

    // Always fetch public session metadata as a baseline (titles, descriptions, order)
    // If user is logged in, fetchEnrolledSessionData will upgrade with full data (URLs, quizzes)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-sessions?course_id=${courseData.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const publicSessions = (data.sessions || []) as Session[];
        // Only set public sessions if enrolled content hasn't loaded yet
        if (!enrolledContentLoadedRef2.current) {
          setSessions(publicSessions);
        }
      }
    } catch (e) {
      console.error('Failed to fetch public sessions:', e);
    }
    if (!user) {
      setContentReady(true);
    }
    setIsLoading(false);
  };

  // Fetch full session data (with sensitive URLs) once user is authenticated AND enrolled
  const fetchEnrolledSessionData = useCallback(async () => {
    if (!user || !course) return;

    // Check enrollment first — RLS now requires it
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle();

    if (!enrollment) {
      const allowed = await canEnrollInCourse(supabase, user.id, course);
      if (allowed) {
        await supabase.from('enrollments').insert({ user_id: user.id, course_id: course.id });
        autoEnrolledRef.current = true;
      }
    }

    const sessionsRes = await supabase.from('sessions').select('id, title, description, recording_url, presentation_url, session_order, text_content').eq('course_id', course.id).order('session_order', { ascending: true });

    if (sessionsRes.data) {
      enrolledContentLoadedRef2.current = true;
      setSessions(sessionsRes.data);

      const sessionIds = sessionsRes.data.map(s => s.id);
      if (sessionIds.length > 0) {
        const [quizzesRes, readingsRes] = await Promise.all([
          supabase.from('session_quizzes').select('session_id, quiz_id, quizzes(id, title)').in('session_id', sessionIds),
          supabase.from('pre_reading_materials').select('id, title, link, session_id').in('session_id', sessionIds).order('display_order', { ascending: true }),
        ]);

        if (quizzesRes.data) {
          const grouped: Record<string, SessionQuiz[]> = {};
          quizzesRes.data.forEach((sq: any) => {
            if (!grouped[sq.session_id]) grouped[sq.session_id] = [];
            grouped[sq.session_id].push(sq);
          });
          setSessionQuizzes(grouped);
        }

        if (readingsRes.data) {
          const grouped: Record<string, PreReadingMaterial[]> = {};
          readingsRes.data.forEach((m: any) => {
            if (!grouped[m.session_id]) grouped[m.session_id] = [];
            grouped[m.session_id].push(m);
          });
          setSessionReadings(grouped);
        }
      }
    }
    setContentReady(true);
    setIsLoading(false);
  }, [user, course]);

  const handleSessionCompleted = useCallback(async (sessionId: string) => {
    if (!user || completedSessionIds.has(sessionId)) return;

    // Optimistically update UI
    const newCompleted = new Set([...completedSessionIds, sessionId]);
    setCompletedSessionIds(newCompleted);

    // Check if this brings us to 100%
    const quizSessionIds = new Set(
      Object.entries(sessionQuizzes)
        .filter(([, quizzes]) => quizzes.length > 0)
        .map(([sessionId]) => sessionId),
    );
    const trackable = sessions.filter((s) => isTrackableOnDemandSession(s, quizSessionIds));
    const allDone = trackable.length > 0 && trackable.every(s => newCompleted.has(s.id));
    if (allDone) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    // Upsert into session_progress
    await supabase.from('session_progress').upsert(
      { user_id: user.id, session_id: sessionId, is_completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,session_id' }
    );
  }, [user, completedSessionIds, sessions, sessionQuizzes]);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const autoEnrolledRef = useRef(false);
  /** Session id that should autoplay when its player mounts (set by next-video flow). */
  const autoPlaySessionIdRef = useRef<string | null>(null);

  // Reset auto-enroll ref when course changes
  useEffect(() => {
    autoEnrolledRef.current = false;
  }, [slug]);

  const handleAutoEnroll = useCallback(async () => {
    if (autoEnrolledRef.current || !user || !course) return;
    autoEnrolledRef.current = true;

    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle();

    if (!data) {
      const allowed = await canEnrollInCourse(supabase, user.id, course);
      if (allowed) {
        await supabase.from('enrollments').insert({ user_id: user.id, course_id: course.id });
        fetchEnrolledSessionData();
      }
    }
  }, [user, course, fetchEnrolledSessionData]);

  const handleNextSession = useCallback(() => {
    const idx = sessions.findIndex(s => s.id === activeSessionId);
    if (idx >= 0 && idx < sessions.length - 1) {
      const nextId = sessions[idx + 1].id;
      autoPlaySessionIdRef.current = nextId;
      setActiveSessionId(nextId);
      mobileScrollRef.current?.scrollTo(0, 0);
    }
  }, [sessions, activeSessionId]);

  const handlePreviousSession = useCallback(() => {
    const idx = sessions.findIndex(s => s.id === activeSessionId);
    if (idx > 0) {
      autoPlaySessionIdRef.current = null;
      setActiveSessionId(sessions[idx - 1].id);
      mobileScrollRef.current?.scrollTo(0, 0);
    }
  }, [sessions, activeSessionId]);

  const consumeAutoPlay = useCallback(() => {
    autoPlaySessionIdRef.current = null;
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const shouldAutoPlay =
    activeSessionId !== null && autoPlaySessionIdRef.current === activeSessionId;
  const activeHasVideo = !!(activeSession?.recording_url && isVideoUrl(activeSession.recording_url));
  const activeHasText = activeSession ? sessionHasText(activeSession) : false;
  const activeIsTextOnly = activeHasText && !activeHasVideo;
  const activeIsCompleted = activeSession ? completedSessionIds.has(activeSession.id) : false;

  const quizSessionIds = new Set(
    Object.entries(sessionQuizzes)
      .filter(([, quizzes]) => quizzes.length > 0)
      .map(([sessionId]) => sessionId),
  );

  // Progress calculation: sessions with video, text, or quizzes count as trackable
  const trackableSessions = sessions.filter((s) => isTrackableOnDemandSession(s, quizSessionIds));
  const completedTrackableCount = trackableSessions.filter(s => completedSessionIds.has(s.id)).length;
  const completionPercent = trackableSessions.length > 0 ? Math.round((completedTrackableCount / trackableSessions.length) * 100) : 0;

  // Next session for popup
  const currentIdx = sessions.findIndex(s => s.id === activeSessionId);

  // Show the live-mentorship upsell modal every time the user lands on the 3rd lesson
  // (by display position, not the raw DB session_order value).
  useEffect(() => {
    if (currentIdx === 2) {
      setUpsellOpen(true);
    }
  }, [activeSessionId, currentIdx]);

  const nextSessionRaw = currentIdx >= 0 && currentIdx < sessions.length - 1 ? sessions[currentIdx + 1] : null;
  const nextSessionForPlayer = nextSessionRaw ? {
    id: nextSessionRaw.id,
    title: nextSessionRaw.title,
    type: getContentType(nextSessionRaw, (sessionQuizzes[nextSessionRaw.id]?.length || 0) > 0, (sessionReadings[nextSessionRaw.id]?.length || 0) > 0),
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="container py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-6">
            <Skeleton className="h-[600px] w-80" />
            <Skeleton className="h-[600px] flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
          <Button asChild><Link to="/courses?tab=free"><ChevronLeft className="mr-2 h-4 w-4" />Back to courses</Link></Button>
        </div>
      </div>
    );
  }

  // Header block: back link, course title, mentor name, and the feedback trigger.
  const headerBlock = (
    <div className="p-4 border-b border-border shrink-0">
      <Link to="/courses?tab=free" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
        <ChevronLeft className="h-3 w-3" /> Back to Free Courses
      </Link>
      <h1 className="text-lg font-display font-bold text-foreground leading-tight">{course.name}</h1>
      {course.mentor_name && <p className="text-xs text-muted-foreground mt-1">by {course.mentor_name}</p>}
      {user && (
        <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(true)} className="gap-1.5 mt-2 -ml-2 text-xs h-7 px-2">
          <MessageSquare className="h-3 w-3" /> Feedback
        </Button>
      )}
    </div>
  );

  const mobileCompactHeader = (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card">
      <Link
        to="/courses?tab=free"
        className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Back to free courses"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div className="flex-1 min-w-0 text-center px-1">
        <h1 className="font-display font-semibold text-sm text-foreground truncate">
          {course.name}
        </h1>
        {course.mentor_name && (
          <p className="text-[11px] text-muted-foreground truncate">
            by {course.mentor_name}
          </p>
        )}
      </div>
      {user && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setFeedbackOpen(true)}
          aria-label="Feedback"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setSidebarOpen(true)}
        className="shrink-0 gap-1 h-8 px-2.5"
      >
        <List className="h-3.5 w-3.5" />
        <span className="text-xs">Lessons</span>
      </Button>
    </div>
  );

  // Lesson list rows (rendering wrapper differs between mobile and desktop).
  const lessonListItems = sessions.map((session, idx) => {
    const hasQuizzes = (sessionQuizzes[session.id]?.length || 0) > 0;
    const hasReadings = (sessionReadings[session.id]?.length || 0) > 0;
    const type = getContentType(session, hasQuizzes, hasReadings);
    const Icon = contentIcons[type];
    const isActive = activeSessionId === session.id;
    const isCompleted = completedSessionIds.has(session.id);

    return (
      <button
        key={session.id}
        onClick={() => {
          autoPlaySessionIdRef.current = null;
          setActiveSessionId(session.id);
          if (isMobile) {
            setSidebarOpen(false);
            mobileScrollRef.current?.scrollTo(0, 0);
          }
        }}
        className={`w-full text-left rounded-lg px-3 py-3 flex items-start gap-3 transition-colors border-l-2 ${
          isActive
            ? 'bg-primary/10 border-primary text-foreground'
            : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className={`mt-0.5 shrink-0 ${isActive ? 'text-primary' : ''}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium leading-snug ${isActive ? 'text-foreground' : ''}`}>
            {idx + 1}. {session.title}
          </p>
          {session.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{session.description}</p>
          )}
        </div>
        {user && isCompleted && (
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
        )}
      </button>
    );
  });

  const lessonListSectionDesktop = (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Lessons ({sessions.length})
        </h2>
        {lessonListItems}
      </div>
    </ScrollArea>
  );

  // Progress bar (desktop lives in the sidebar footer, mobile is inline above content).
  const progressBlockDesktop = user && trackableSessions.length > 0 && (
    <div className="p-4 border-t border-border bg-card shrink-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground font-medium">Your progress</span>
        <span className="text-xs font-semibold text-foreground">{completionPercent}%</span>
      </div>
      <Progress value={completionPercent} className="h-2" />
      <p className="text-xs text-muted-foreground mt-1.5">
        {completedTrackableCount} of {trackableSessions.length} lessons completed
      </p>
    </div>
  );

  const progressBlockMobile = user && trackableSessions.length > 0 && (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground font-medium">Your progress</span>
        <span className="text-xs font-semibold text-foreground">{completionPercent}%</span>
      </div>
      <Progress value={completionPercent} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {completedTrackableCount} of {trackableSessions.length} lessons completed
      </p>
    </div>
  );

  // Session title/description + video player.
  const videoBlock = (
    <div>
      {isMobile && currentIdx >= 0 && (
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Lesson {currentIdx + 1}
        </p>
      )}
      <h2 className={`font-display font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>{activeSession?.title}</h2>
      {activeSession?.description &&
        activeSession.description.trim() !== activeSession.title.trim() && (
          <p className="text-muted-foreground mt-1">{activeSession.description}</p>
        )}
      {activeSession?.recording_url && (
        <div className="mt-4">
          <OnDemandVideoPlayer
            videoUrl={activeSession.recording_url}
            nextSession={nextSessionForPlayer}
            onCompleted={() => handleSessionCompleted(activeSession.id)}
            onNextSession={handleNextSession}
            autoPlay={shouldAutoPlay}
            onAutoPlayConsumed={consumeAutoPlay}
            onPlay={handleAutoEnroll}
          />
        </div>
      )}
    </div>
  );

  const textContentBlock = activeSession?.text_content?.trim() && (
    <div className="mt-6 rounded-xl border border-border bg-card/50 p-5 md:p-8 space-y-4">
      <Markdown content={activeSession.text_content} className="lesson-content prose" />
      {activeIsTextOnly && user && !activeIsCompleted && (
        <Button
          onClick={() => {
            handleAutoEnroll();
            handleSessionCompleted(activeSession.id);
          }}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark lesson complete
        </Button>
      )}
      {activeIsTextOnly && user && activeIsCompleted && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(142 71% 45%)' }} />
          Lesson completed
        </div>
      )}
    </div>
  );

  const quizBlock = activeSession && sessionQuizzes[activeSession.id]?.length > 0 && (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quizzes</h3>
      <div className="space-y-2">
        {sessionQuizzes[activeSession.id].map((sq) => (
          <InlineQuiz
            key={sq.quiz_id}
            quizId={sq.quiz_id}
            quizTitle={sq.quizzes?.title || 'Quiz'}
            onCompleted={() => {
              handleAutoEnroll();
              handleSessionCompleted(activeSession.id);
            }}
          />
        ))}
      </div>
    </div>
  );

  const resourcesBlock = activeSession?.presentation_url && (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resources</h3>
      <a
        href={activeSession.presentation_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
      >
        <ExternalLink className="h-5 w-5 text-primary shrink-0" />
        <span className="font-medium text-sm">Presentation / Slides</span>
      </a>
    </div>
  );

  const readingsBlock = activeSession && sessionReadings[activeSession.id]?.length > 0 && (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reading Materials</h3>
      <div className="space-y-2">
        {sessionReadings[activeSession.id].map((m) => (
          <a
            key={m.id}
            href={m.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <span className="font-medium text-sm">{m.title}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
          </a>
        ))}
      </div>
    </div>
  );

  const mobileLessonNavBlock = activeSession && sessions.length > 1 && (
    <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentIdx <= 0}
          onClick={handlePreviousSession}
          className="h-8 min-w-[7.25rem] rounded-full px-3 text-xs justify-self-start"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="text-[11px] text-muted-foreground text-center tabular-nums px-1">
          Lesson {currentIdx + 1} of {sessions.length}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={currentIdx < 0 || currentIdx >= sessions.length - 1}
          onClick={handleNextSession}
          className="h-8 min-w-[7.25rem] rounded-full px-3 text-xs justify-self-end"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  const authOverlay = !user ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-display font-bold mb-2">Sign in to continue learning</h3>
        <p className="text-muted-foreground mb-2 text-sm">{course.name}</p>
        <p className="text-muted-foreground mb-6 text-sm">
          Create a free account to access all on-demand course content.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to={slug ? buildLoginUrl(onDemandCoursePath(slug), { tab: "signup" }) : "/login?tab=signup"}>
              <UserPlus className="mr-2 h-4 w-4" /> Sign Up Free
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={slug ? buildLoginUrl(onDemandCoursePath(slug)) : "/login"}>
              <LogIn className="mr-2 h-4 w-4" /> Log In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const noSessionsBlock = (
    <div className="text-center py-16 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No sessions available for this course yet.</p>
    </div>
  );

  return (
    <div
      className="h-screen bg-background flex flex-col overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="shrink-0">
        <PublicHeader />
      </div>

      {isMobile ? (
        /* Mobile: compact header + drawer for lessons + fixed footer nav */
        <>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent
              side="left"
              className="w-[85%] max-w-sm p-0 flex flex-col rounded-r-2xl overflow-hidden bg-card"
            >
              <SheetHeader className="px-4 pt-4 pb-3 pr-10 space-y-0 border-b border-border">
                <SheetTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">
                  Lessons ({sessions.length})
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1">
                <div className="px-4 py-3 space-y-1">
                  {lessonListItems}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div ref={mobileScrollRef} className="flex-1 flex flex-col overflow-y-auto min-h-0">
            {mobileCompactHeader}

            <div className="flex-1 relative">
              {authOverlay}
              <div className={`px-4 py-4 pb-4 space-y-6 ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
                {activeSession ? (
                  <>
                    {progressBlockMobile}
                    {videoBlock}
                    {textContentBlock}
                    {quizBlock}
                    {resourcesBlock}
                    {readingsBlock}
                  </>
                ) : (
                  noSessionsBlock
                )}
              </div>
            </div>
          </div>
          {mobileLessonNavBlock}
        </>
      ) : (
        /* Desktop: two-column split pane */
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
          {/* Left sidebar - session list */}
          <aside className="md:w-80 lg:w-96 md:border-r border-border bg-card shrink-0 h-full min-h-0 overflow-hidden flex flex-col">
            {headerBlock}
            {lessonListSectionDesktop}
            {progressBlockDesktop}
          </aside>

          {/* Right panel - content area */}
          <div className="flex-1 min-h-0 h-full overflow-y-auto relative">
            {authOverlay}

            {/* Content (blurred when not logged in) */}
            <div className={`p-3 md:p-6 ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
              {activeSession ? (
                <div className={`space-y-6 ${activeIsTextOnly ? 'max-w-3xl' : 'max-w-4xl'}`}>
                  {videoBlock}
                  {textContentBlock}
                  {quizBlock}
                  {resourcesBlock}
                  {readingsBlock}
                </div>
              ) : (
                noSessionsBlock
              )}
            </div>
          </div>
        </div>
      )}

      {user && course && (
        <FeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          courseId={course.id}
          entityName={course.name}
        />
      )}

      <MentorshipUpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} />
    </div>
  );
}
