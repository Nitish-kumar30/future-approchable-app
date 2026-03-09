import { useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PublicHeader from '@/components/layout/PublicHeader';
import VimeoPlayer from '@/components/session/VimeoPlayer';
import InlineQuiz from '@/components/session/InlineQuiz';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ExternalLink,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import FeedbackDialog from '@/components/FeedbackDialog';

interface Course {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  recording_url: string | null;
  presentation_url: string | null;
  session_order: number | null;
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

function isVimeoUrl(url: string) {
  return url.includes('vimeo.com');
}

function isVideoUrl(url: string) {
  return url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo.com');
}

function getYouTubeEmbed(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return null;
}

function getContentType(session: Session, hasQuizzes: boolean, hasReadings: boolean): string {
  if (session.recording_url && isVideoUrl(session.recording_url)) return 'video';
  if (hasQuizzes) return 'quiz';
  if (session.presentation_url) return 'link';
  if (hasReadings) return 'reading';
  return 'content';
}

const contentIcons: Record<string, typeof PlayCircle> = {
  video: PlayCircle,
  quiz: ClipboardList,
  link: ExternalLink,
  reading: BookOpen,
  content: FileText,
};

export default function OnDemandCourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<Record<string, SessionQuiz[]>>({});
  const [sessionReadings, setSessionReadings] = useState<Record<string, PreReadingMaterial[]>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedSessionIds, setCompletedSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (slug) {
      enrolledContentLoadedRef2.current = false;
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
    if (!user || sessionIds.length === 0) return;
    const { data } = await supabase
      .from('session_progress')
      .select('session_id')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .in('session_id', sessionIds);

    if (data) {
      setCompletedSessionIds(new Set(data.map(p => p.session_id)));
    }
  };

  const enrolledContentLoadedRef2 = useRef(false);

  const fetchCourseData = async () => {
    // First fetch the course by slug
    const courseRes = await supabase.from('courses').select('id, name, description, mentor_name, duration, image_url').eq('slug', slug!).single();

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
          if (publicSessions.length > 0 && !activeSessionId) setActiveSessionId(publicSessions[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch public sessions:', e);
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
      // Auto-enroll for on-demand courses so user can see content immediately
      await supabase.from('enrollments').insert({ user_id: user.id, course_id: course.id });
      autoEnrolledRef.current = true;
    }

    const sessionsRes = await supabase.from('sessions').select('id, title, description, recording_url, presentation_url, session_order').eq('course_id', course.id).order('session_order', { ascending: true });

    if (sessionsRes.data) {
      setSessions(sessionsRes.data);
      if (sessionsRes.data.length > 0 && !activeSessionId) setActiveSessionId(sessionsRes.data[0].id);

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
    setIsLoading(false);
  }, [user, course, activeSessionId]);

  const handleSessionCompleted = useCallback(async (sessionId: string) => {
    if (!user || completedSessionIds.has(sessionId)) return;

    // Optimistically update UI
    const newCompleted = new Set([...completedSessionIds, sessionId]);
    setCompletedSessionIds(newCompleted);

    // Check if this brings us to 100%
    const trackable = sessions.filter(s => {
      const hasVideo = s.recording_url && isVideoUrl(s.recording_url);
      const hasQuizzes = (sessionQuizzes[s.id]?.length || 0) > 0;
      return hasVideo || hasQuizzes;
    });
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

  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const autoEnrolledRef = useRef(false);

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
      await supabase.from('enrollments').insert({ user_id: user.id, course_id: course.id });
      // Re-fetch full session data now that user is enrolled
      fetchEnrolledSessionData();
    }
  }, [user, course, fetchEnrolledSessionData]);

  const handleNextSession = useCallback(() => {
    const currentIdx = sessions.findIndex(s => s.id === activeSessionId);
    if (currentIdx >= 0 && currentIdx < sessions.length - 1) {
      setAutoPlayNext(true);
      setActiveSessionId(sessions[currentIdx + 1].id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Progress calculation: sessions with video OR quizzes count as trackable
  const trackableSessions = sessions.filter(s => {
    const hasVideo = s.recording_url && isVideoUrl(s.recording_url);
    const hasQuizzes = (sessionQuizzes[s.id]?.length || 0) > 0;
    return hasVideo || hasQuizzes;
  });
  const completedTrackableCount = trackableSessions.filter(s => completedSessionIds.has(s.id)).length;
  const completionPercent = trackableSessions.length > 0 ? Math.round((completedTrackableCount / trackableSessions.length) * 100) : 0;

  // Next session for popup
  const currentIdx = sessions.findIndex(s => s.id === activeSessionId);
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
          <Button asChild><Link to="/on-demand"><ChevronLeft className="mr-2 h-4 w-4" />Back to courses</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      {/* Split pane - fills remaining viewport */}
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left sidebar - session list */}
        <aside className="md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border bg-card shrink-0 flex flex-col">
          {/* Course info merged into sidebar */}
          <div className="p-4 border-b border-border shrink-0">
            <Link to="/on-demand" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
              <ChevronLeft className="h-3 w-3" /> Back to On-Demand Courses
            </Link>
            <h1 className="text-lg font-display font-bold text-foreground leading-tight">{course.name}</h1>
            {course.mentor_name && <p className="text-xs text-muted-foreground mt-1">by {course.mentor_name}</p>}
            {user && (
              <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(true)} className="gap-1.5 mt-2 -ml-2 text-xs h-7 px-2">
                <MessageSquare className="h-3 w-3" /> Feedback
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Lessons ({sessions.length})
              </h2>
              {sessions.map((session, idx) => {
                const hasQuizzes = (sessionQuizzes[session.id]?.length || 0) > 0;
                const hasReadings = (sessionReadings[session.id]?.length || 0) > 0;
                const type = getContentType(session, hasQuizzes, hasReadings);
                const Icon = contentIcons[type];
                const isActive = activeSessionId === session.id;
                const isCompleted = completedSessionIds.has(session.id);

                return (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full text-left rounded-lg px-3 py-3 flex items-start gap-3 transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
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
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(142 71% 45%)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Progress bar at bottom of sidebar */}
          {user && trackableSessions.length > 0 && (
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
          )}
        </aside>

        {/* Right panel - content area */}
        <div className="flex-1 relative">
          {!user ? (
            /* Auth gate overlay */
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
                    <Link to={`/auth?tab=signup&redirect=/on-demand/${slug}`}>
                      <UserPlus className="mr-2 h-4 w-4" /> Sign Up Free
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/auth?redirect=/on-demand/${slug}`}>
                      <LogIn className="mr-2 h-4 w-4" /> Log In
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Content (blurred when not logged in) */}
          <div className={`p-4 md:p-6 ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
            {activeSession ? (
              <div className="max-w-4xl space-y-6">
                <div>
                  <h2 className="text-xl font-display font-bold">{activeSession.title}</h2>
                  {activeSession.description && (
                    <p className="text-muted-foreground mt-1">{activeSession.description}</p>
                  )}
                </div>

                {/* Video embed */}
                {activeSession.recording_url && (() => {
                  const url = activeSession.recording_url;

                  // Vimeo: use SDK player with popup + 20s completion
                  if (isVimeoUrl(url)) {
                    return (
                      <VimeoPlayer
                        key={activeSession.id}
                        videoUrl={url}
                        title={activeSession.title}
                        nextSession={nextSessionForPlayer}
                        onCompleted={() => handleSessionCompleted(activeSession.id)}
                        onNextSession={handleNextSession}
                        autoPlay={autoPlayNext}
                        onAutoPlayConsumed={() => setAutoPlayNext(false)}
                        onPlay={handleAutoEnroll}
                      />
                    );
                  }

                  // YouTube: plain iframe
                  const ytEmbed = getYouTubeEmbed(url);
                  if (ytEmbed) {
                    return (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                        <iframe
                          src={ytEmbed}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={activeSession.title}
                        />
                      </div>
                    );
                  }

                  // External link fallback
                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" /> Open recording
                    </a>
                  );
                })()}

                {/* Quizzes */}
                {sessionQuizzes[activeSession.id]?.length > 0 && (
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
                )}

                {/* External link */}
                {activeSession.presentation_url && (
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
                )}

                {/* Pre-reading materials */}
                {sessionReadings[activeSession.id]?.length > 0 && (
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
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sessions available for this course yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {user && course && (
        <FeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          courseId={course.id}
          entityName={course.name}
        />
      )}
    </div>
  );
}
