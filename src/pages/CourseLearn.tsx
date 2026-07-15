import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import HlsPlayer from '@/components/video/HlsPlayer';
import { StarRating } from '@/components/course/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, Circle, Play, Lock, FileQuestion, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [myRating, setMyRating] = useState<number>(0);
  const [myComment, setMyComment] = useState<string>('');
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [community, setCommunity] = useState<any>(null);

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
    setRatingAvg(data.rating_avg ?? 0);
    setRatingCount(data.rating_count ?? 0);
    setLoading(false);
  }, [slug, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!course?.id) return;
    invokeFn('get-course-community-progress', { query: { course_id: course.id } }).then((d) => {
      if (!d?.error) setCommunity(d);
    });
  }, [course?.id]);

  // Default selection: first watchable item
  useEffect(() => {
    if (selected || sessions.length === 0) return;
    for (const s of sessions) {
      const chs = chapters.filter((c) => c.session_id === s.id);
      if (chs.length) {
        const first = chs.find((c) => c.can_watch) ?? chs[0];
        setSelected({ kind: 'chapter', id: first.id });
        return;
      }
      if (s.video_url && (isEnrolled || s.is_content_unlocked)) {
        setSelected({ kind: 'session', id: s.id });
        return;
      }
    }
  }, [sessions, chapters, selected, isEnrolled]);

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

  const submitRating = async () => {
    if (!course?.id) return;
    const res = await invokeFn('submit-course-rating', {
      body: { course_id: course.id, rating: myRating, comment: myComment },
    });
    if (res?.error) {
      toast({ title: 'Failed to submit rating', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Rating saved' });
      load();
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <p className="text-center py-16 text-muted-foreground">Course not found.</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">{course.name}</h1>
            {ratingCount > 0 && (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <StarRating value={ratingAvg} readOnly size={16} />
                <span>({ratingCount})</span>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate(`/courses/${course.slug}`)}>Course details</Button>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Your progress</span>
                  <span className="text-muted-foreground">{overallPct}%</span>
                </div>
                <Progress value={overallPct} />
              </div>
              {community && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Community: {community.avg_completion_pct ?? 0}% ({community.learner_count ?? 0} learners)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Sidebar */}
          <Card className="lg:sticky lg:top-4 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Course content</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="multiple" defaultValue={sessions.map((s) => s.id)}>
                {sessions.map((s) => {
                  const chs = chapters.filter((c) => c.session_id === s.id).sort((a, b) => a.chapter_order - b.chapter_order);
                  const quizzes = sessionQuizzes.filter((sq) => sq.session_id === s.id);
                  return (
                    <AccordionItem key={s.id} value={s.id}>
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2 text-left">
                          {sessionProgress[s.id] ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="line-clamp-2">Session {s.session_order}: {s.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1 pl-1">
                          {chs.length === 0 && s.video_url && (
                            <li>
                              <button
                                onClick={() => setSelected({ kind: 'session', id: s.id })}
                                className={cn(
                                  'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition',
                                  selected?.kind === 'session' && selected.id === s.id && 'bg-muted'
                                )}
                              >
                                <Play className="h-3.5 w-3.5" />
                                <span className="flex-1 truncate">Watch session</span>
                              </button>
                            </li>
                          )}
                          {chs.map((c) => {
                            const completed = chapterProgress[c.id]?.is_completed;
                            const active = selected?.kind === 'chapter' && selected.id === c.id;
                            return (
                              <li key={c.id}>
                                <button
                                  onClick={() => setSelected({ kind: 'chapter', id: c.id })}
                                  className={cn(
                                    'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition',
                                    active && 'bg-muted'
                                  )}
                                >
                                  {completed ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                  ) : c.can_watch ? (
                                    <Play className="h-3.5 w-3.5 shrink-0" />
                                  ) : (
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="flex-1 truncate">{c.title}</span>
                                  {c.is_preview && (
                                    <span className="text-[10px] font-medium text-blue-600">Preview</span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                          {quizzes.map((sq) => sq.quiz && (
                            <li key={sq.quiz.id}>
                              <button
                                onClick={() => navigate(`/quiz/${sq.quiz!.id}`)}
                                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition"
                              >
                                <FileQuestion className="h-3.5 w-3.5" />
                                <span className="flex-1 truncate">{sq.quiz.title}</span>
                                {quizSubmissions[sq.quiz.id] != null && (
                                  <span className="text-[10px] font-medium text-green-600">Done</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* Main viewer */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {currentChapter?.can_watch && currentChapter.hls_url ? (
                  <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                    <HlsPlayer
                      src={currentChapter.hls_url}
                      onNearEnd={() => markChapterComplete(currentChapter.id, currentChapter.duration_seconds ?? 0, true)}
                      onProgress={(t) => {
                        const prev = chapterProgress[currentChapter.id]?.watched_seconds ?? 0;
                        if (Math.floor(t) - prev >= 15) {
                          markChapterComplete(currentChapter.id, Math.floor(t), chapterProgress[currentChapter.id]?.is_completed ?? false);
                        }
                      }}
                    />
                  </div>
                ) : selected?.kind === 'session' && currentSession?.video_url ? (
                  <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                    <iframe src={currentSession.video_url} className="w-full h-full" allow="fullscreen" />
                  </div>
                ) : currentChapter && !currentChapter.can_watch ? (
                  <div className="aspect-video bg-muted rounded-t-lg flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Lock className="h-8 w-8" />
                    <p>Enroll to unlock this chapter.</p>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center text-muted-foreground">
                    <p>Select a chapter to start watching.</p>
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <h2 className="text-lg font-semibold">
                    {currentChapter ? currentChapter.title : currentSession?.title}
                  </h2>
                  {(currentChapter?.description || currentSession?.description) && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentChapter?.description || currentSession?.description || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isEnrolled && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Rate this course</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <StarRating value={myRating} onChange={setMyRating} />
                  <Textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    placeholder="Optional feedback (max 2000 chars)"
                    maxLength={2000}
                    rows={3}
                  />
                  <Button size="sm" onClick={submitRating} disabled={!myRating}>Submit rating</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
