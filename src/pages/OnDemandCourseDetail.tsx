import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PublicHeader from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';

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

function getVideoEmbed(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function getContentType(session: Session, hasQuizzes: boolean, hasReadings: boolean): string {
  if (session.recording_url && (session.recording_url.includes('youtube') || session.recording_url.includes('vimeo') || session.recording_url.includes('youtu.be'))) return 'video';
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
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<Record<string, SessionQuiz[]>>({});
  const [sessionReadings, setSessionReadings] = useState<Record<string, PreReadingMaterial[]>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    const [courseRes, sessionsRes] = await Promise.all([
      supabase.from('courses').select('id, name, description, mentor_name, duration, image_url').eq('id', id!).single(),
      supabase.from('sessions').select('id, title, description, recording_url, presentation_url, session_order').eq('course_id', id!).order('session_order', { ascending: true }),
    ]);

    if (courseRes.data) setCourse(courseRes.data);
    if (sessionsRes.data) {
      setSessions(sessionsRes.data);
      if (sessionsRes.data.length > 0) setActiveSessionId(sessionsRes.data[0].id);

      // Fetch quizzes and readings for all sessions
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
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

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

      {/* Course header */}
      <div className="border-b border-border bg-card">
        <div className="container py-4">
          <Link to="/on-demand" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ChevronLeft className="h-4 w-4" /> Back to On-Demand Courses
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">{course.name}</h1>
          {course.mentor_name && <p className="text-sm text-muted-foreground mt-1">by {course.mentor_name}</p>}
        </div>
      </div>

      {/* Split pane */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left sidebar - session list */}
        <aside className="md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border bg-card shrink-0">
          <ScrollArea className="h-auto md:h-[calc(100vh-12rem)]">
            <div className="p-4 space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Lessons ({sessions.length})
              </h2>
              {sessions.map((session, idx) => {
                const hasQuizzes = (sessionQuizzes[session.id]?.length || 0) > 0;
                const hasReadings = (sessionReadings[session.id]?.length || 0) > 0;
                const type = getContentType(session, hasQuizzes, hasReadings);
                const Icon = contentIcons[type];
                const isActive = activeSessionId === session.id;

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
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-snug ${isActive ? 'text-foreground' : ''}`}>
                        {idx + 1}. {session.title}
                      </p>
                      {session.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{session.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
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
                    <Link to={`/auth?tab=signup&redirect=/on-demand/${course.id}`}>
                      <UserPlus className="mr-2 h-4 w-4" /> Sign Up Free
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/auth?redirect=/on-demand/${course.id}`}>
                      <LogIn className="mr-2 h-4 w-4" /> Log In
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Content (blurred when not logged in) */}
          <div className={`p-6 md:p-8 ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
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
                  const embedUrl = getVideoEmbed(activeSession.recording_url);
                  if (embedUrl) {
                    return (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={activeSession.title}
                        />
                      </div>
                    );
                  }
                  return (
                    <a href={activeSession.recording_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
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
                        <Link
                          key={sq.quiz_id}
                          to={`/quiz/${sq.quiz_id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                          <span className="font-medium text-sm">{sq.quizzes?.title || 'Quiz'}</span>
                          <Badge variant="secondary" className="ml-auto">Take Quiz</Badge>
                        </Link>
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
    </div>
  );
}
