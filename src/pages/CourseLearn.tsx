import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import HlsPlayer from '@/components/video/HlsPlayer';
import CourseSidebar from '@/components/course/CourseSidebar';
import RateCourseDialog from '@/components/course/RateCourseDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Lock, Loader2, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course { id: string; slug: string; name: string; description: string | null; }
interface Session { id: string; title: string; description: string | null; session_order: number; video_url: string | null; is_content_unlocked: boolean; }
interface Chapter { id: string; session_id: string; title: string; description: string | null; hls_url: string | null; chapter_order: number; is_preview: boolean; can_watch: boolean; duration_seconds: number | null; }
interface SessionQuiz { session_id: string; display_order: number; quiz: { id: string; title: string } | null; }

async function invokeFn(name: string, opts: { body?: any; method?: string; query?: Record<string, string> } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = new URL(`https://${projectId}.functions.supabase.co/${name}`);
  Object.entries(opts.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

export default function CourseLearn() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<SessionQuiz[]>([]);
  const [chapterProgress, setChapterProgress] = useState<Record<string, { is_completed: boolean; watched_seconds: number }>>({});
  const [sessionProgress, setSessionProgress] = useState<Record<string, boolean>>({});
  const [quizSubmissions, setQuizSubmissions] = useState<Record<string, number | null>>({});
  const [selected, setSelected] = useState<{ kind: 'chapter' | 'session'; id: string } | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<number>(0);
  const [myComment, setMyComment] = useState<string>('');
  const [rateOpen, setRateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const data = await invokeFn('get-course-learn', { query: { slug } });
    if (data.error) {
      toast({ title: 'Failed to load course', description: data.error, variant: 'destructive' });
      setLoading(false);
      return;
    }
    setCourse(data.course);
    setIsEnrolled(data.is_enrolled);
    setSessions(data.sessions ?? []);
    setChapters(data.chapters ?? []);
    setSessionQuizzes(data.session_quizzes ?? []);
    setChapterProgress(Object.fromEntries((data.chapter_progress ?? []).map((p: any) => [p.chapter_id, p])));
    setSessionProgress(Object.fromEntries((data.session_progress ?? []).map((p: any) => [p.session_id, p.is_completed])));
    setQuizSubmissions(Object.fromEntries((data.quiz_submissions ?? []).map((q: any) => [q.quiz_id, q.score])));
    setMyRating(data.my_rating?.rating ?? 0);
    setMyComment(data.my_rating?.comment ?? '');
    setLoading(false);
  }, [slug, toast]);

  useEffect(() => { load(); }, [load]);

  // Ordered playable items (chapters and no-chapter sessions), for prev/next + auto-advance.
  const playable = useMemo(() => {
    const items: { kind: 'chapter' | 'session'; id: string; sessionId: string }[] = [];
    for (const s of sessions) {
      const chs = chapters
        .filter((c) => c.session_id === s.id)
        .sort((a, b) => a.chapter_order - b.chapter_order);
      if (chs.length === 0 && s.video_url) {
        items.push({ kind: 'session', id: s.id, sessionId: s.id });
      } else {
        for (const c of chs) items.push({ kind: 'chapter', id: c.id, sessionId: s.id });
      }
    }
    return items;
  }, [sessions, chapters]);

  // Default selection: first unwatched watchable, else first item.
  useEffect(() => {
    if (selected || playable.length === 0) return;
    const firstUnwatched = playable.find((it) => {
      if (it.kind === 'chapter') return !chapterProgress[it.id]?.is_completed;
      return !sessionProgress[it.id];
    }) ?? playable[0];
    setSelected({ kind: firstUnwatched.kind, id: firstUnwatched.id });
    setCurrentSessionId(firstUnwatched.sessionId);
  }, [playable, selected, chapterProgress, sessionProgress]);

  const totalChapters = chapters.length;
  const completedChapters = useMemo(
    () => chapters.filter((c) => chapterProgress[c.id]?.is_completed).length,
    [chapters, chapterProgress]
  );
  const totalSessions = sessions.length;
  const completedSessions = useMemo(
    () => sessions.filter((s) => sessionProgress[s.id]).length,
    [sessions, sessionProgress]
  );
  const overallPct = totalChapters
    ? Math.round((completedChapters / totalChapters) * 100)
    : totalSessions
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

  const currentChapter = selected?.kind === 'chapter'
    ? chapters.find((c) => c.id === selected.id) ?? null
    : null;
  const currentSession = selected?.kind === 'session'
    ? sessions.find((s) => s.id === selected.id) ?? null
    : (currentChapter ? sessions.find((s) => s.id === currentChapter.session_id) ?? null : null);

  const nextSession = useMemo(() => {
    if (!currentSession) return null;
    const sorted = [...sessions].sort((a, b) => a.session_order - b.session_order);
    const idx = sorted.findIndex((s) => s.id === currentSession.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  }, [sessions, currentSession]);

  // Throttle progress writes without triggering re-renders of the player.
  const lastSavedSecRef = useRef<Record<string, number>>({});


  const currentIdx = selected ? playable.findIndex((p) => p.kind === selected.kind && p.id === selected.id) : -1;
  const go = (delta: number) => {
    if (currentIdx < 0) return;
    const next = playable[currentIdx + delta];
    if (!next) return;
    setSelected({ kind: next.kind, id: next.id });
    setCurrentSessionId(next.sessionId);
  };

  const markChapterComplete = async (chapterId: string, watched: number, completed: boolean) => {
    if (!user) return;
    setChapterProgress((prev) => ({
      ...prev,
      [chapterId]: { is_completed: completed, watched_seconds: watched },
    }));
    await invokeFn('update-chapter-progress', {
      body: { chapter_id: chapterId, watched_seconds: watched, is_completed: completed },
    });
  };

  const submitRating = async (rating: number, comment: string) => {
    if (!course?.id) return;
    const res = await invokeFn('submit-course-rating', {
      body: { course_id: course.id, rating, comment },
    });
    if (res?.error) {
      toast({ title: 'Failed to submit rating', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Rating saved' });
      setMyRating(rating);
      setMyComment(comment);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Course not found.</p>
        <Button onClick={() => navigate('/courses')}>Back to courses</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b flex items-center gap-2 px-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${course.slug}`)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')} className="gap-1 hidden sm:inline-flex">
          <LayoutGrid className="h-4 w-4" /> All courses
        </Button>
        <div className="flex-1 min-w-0 px-2 hidden md:block">
          <div className="text-sm font-medium truncate">{course.name}</div>
          {currentSession && (
            <div className="text-xs text-muted-foreground truncate">
              Session {currentSession.session_order + 1}: {currentSession.title}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" onClick={() => go(-1)} disabled={currentIdx <= 0} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => go(1)} disabled={currentIdx < 0 || currentIdx >= playable.length - 1} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isEnrolled && (
            <Button variant="outline" size="sm" onClick={() => setRateOpen(true)} className="gap-1 ml-1">
              <Star className="h-4 w-4" /> Rate
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[300px_1fr] overflow-hidden">
        <CourseSidebar
          sessions={sessions}
          chapters={chapters}
          quizzes={sessionQuizzes}
          currentSessionId={currentSessionId ?? currentSession?.id ?? null}
          chapterProgress={chapterProgress}
          quizSubmissions={quizSubmissions}
          selected={selected}
          onSelect={(sel) => {
            setSelected(sel);
            const sid = sel.kind === 'chapter'
              ? chapters.find((c) => c.id === sel.id)?.session_id
              : sel.id;
            if (sid) setCurrentSessionId(sid);
          }}
          onSelectSession={(sid) => {
            setCurrentSessionId(sid);
            const firstCh = chapters
              .filter((c) => c.session_id === sid)
              .sort((a, b) => a.chapter_order - b.chapter_order)[0];
            if (firstCh) setSelected({ kind: 'chapter', id: firstCh.id });
            else {
              const s = sessions.find((x) => x.id === sid);
              if (s?.video_url) setSelected({ kind: 'session', id: sid });
            }
          }}
          onOpenQuiz={(quizId) => navigate(`/quiz/${quizId}`)}
          overallPct={overallPct}
        />

        {/* Main viewer */}
        <main className="min-h-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {currentChapter?.can_watch && currentChapter.hls_url ? (
                <HlsPlayer
                  key={currentChapter.id}
                  src={currentChapter.hls_url}
                  onNearEnd={() => markChapterComplete(currentChapter.id, currentChapter.duration_seconds ?? 0, true)}
                  onEnded={() => go(1)}
                  onProgress={(t) => {
                    const prev = chapterProgress[currentChapter.id]?.watched_seconds ?? 0;
                    if (Math.floor(t) - prev >= 15) {
                      markChapterComplete(currentChapter.id, Math.floor(t), chapterProgress[currentChapter.id]?.is_completed ?? false);
                    }
                  }}
                  onError={(msg) => toast({ title: 'Video error', description: msg, variant: 'destructive' })}
                />
              ) : selected?.kind === 'session' && currentSession?.video_url ? (
                <iframe src={currentSession.video_url} className="w-full h-full" allow="fullscreen" />
              ) : currentChapter && !currentChapter.can_watch ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Lock className="h-8 w-8" />
                  <p>Enroll to unlock this chapter.</p>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <p>Select a chapter to start watching.</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-xl font-semibold">
                {currentChapter ? currentChapter.title : currentSession?.title}
              </h1>
              {(currentChapter?.description || currentSession?.description) && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentChapter?.description || currentSession?.description || ''}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <RateCourseDialog
        open={rateOpen}
        onOpenChange={setRateOpen}
        initialRating={myRating}
        initialComment={myComment}
        onSubmit={submitRating}
      />
    </div>
  );
}
