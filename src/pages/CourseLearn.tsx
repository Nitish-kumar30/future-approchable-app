import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Navigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildLoginUrl } from "@/lib/authRedirect";
import HlsPlayer from "@/components/video/HlsPlayer";
import CourseSidebar, { getSessionProgress } from "@/components/course/CourseSidebar";
import { Progress } from "@/components/ui/progress";
import RateCourseDialog from "@/components/course/RateCourseDialog";
import InlineQuiz from "@/components/session/InlineQuiz";
import NextSessionOverlay, { type NextSessionInfo } from "@/components/session/NextSessionOverlay";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Star,
  Lock,
  Loader2,
  LayoutGrid,
  Maximize,
  Minimize,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVideoFullscreen } from "@/hooks/useVideoFullscreen";

interface Course {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}
interface Session {
  id: string;
  title: string;
  description: string | null;
  session_order: number;
  video_url: string | null;
  is_content_unlocked: boolean;
}
interface Chapter {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  hls_url: string | null;
  chapter_order: number;
  is_preview: boolean;
  can_watch: boolean;
  duration_seconds: number | null;
}
interface SessionQuiz {
  session_id: string;
  display_order: number;
  quiz: { id: string; title: string } | null;
}
interface PreReading {
  id: string;
  session_id: string;
  title: string;
  link: string | null;
  display_order: number;
}
interface MiniProject {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  display_order: number;
}

type CurriculumItem = { kind: "chapter" | "session" | "quiz"; id: string; sessionId: string };

async function invokeFn(name: string, opts: { body?: any; method?: string; query?: Record<string, string> } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = new URL(`https://${projectId}.functions.supabase.co/${name}`);
  Object.entries(opts.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

export default function CourseLearn() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sessionQuizzes, setSessionQuizzes] = useState<SessionQuiz[]>([]);
  const [preReadings, setPreReadings] = useState<PreReading[]>([]);
  const [miniProjects, setMiniProjects] = useState<MiniProject[]>([]);
  const [chapterProgress, setChapterProgress] = useState<
    Record<string, { is_completed: boolean; watched_seconds: number }>
  >({});
  const [sessionProgress, setSessionProgress] = useState<Record<string, boolean>>({});
  const [quizSubmissions, setQuizSubmissions] = useState<Record<string, number | null>>({});
  const [selected, setSelected] = useState<{
    kind: "chapter" | "session" | "quiz" | "mini_project";
    id: string;
  } | null>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<number>(0);
  const [myComment, setMyComment] = useState<string>("");
  const [rateOpen, setRateOpen] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!slug) return;
    if (!opts?.silent) setLoading(true);
    const data = await invokeFn("get-course-learn", { query: { slug } });
    if (data.error) {
      toast({ title: "Failed to load course", description: data.error, variant: "destructive" });
      if (!opts?.silent) setLoading(false);
      return;
    }
    setCourse(data.course);
    setIsEnrolled(data.is_enrolled);
    setSessions(data.sessions ?? []);
    setChapters(data.chapters ?? []);
    setSessionQuizzes(data.session_quizzes ?? []);
    setPreReadings(data.pre_readings ?? []);
    setMiniProjects(data.mini_projects ?? []);

    setChapterProgress(Object.fromEntries((data.chapter_progress ?? []).map((p: any) => [p.chapter_id, p])));
    // Union with whatever is already in the ref instead of replacing it —
    // a completion write may still be in flight server-side when a silent
    // reload (e.g. after a quiz) refetches, and we don't want to drop it.
    const serverCompleted: string[] = (data.chapter_progress ?? [])
      .filter((p: any) => p.is_completed)
      .map((p: any) => p.chapter_id);
    completedChapterRef.current = new Set([...completedChapterRef.current, ...serverCompleted]);
    setSessionProgress(
      Object.fromEntries((data.session_progress ?? []).map((p: any) => [p.session_id, p.is_completed])),
    );
    setQuizSubmissions(Object.fromEntries((data.quiz_submissions ?? []).map((q: any) => [q.quiz_id, q.score])));
    setMyRating(data.my_rating?.rating ?? 0);
    setMyComment(data.my_rating?.comment ?? "");
    if (!opts?.silent) setLoading(false);
  }, [slug, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Ordered curriculum items (chapters, session videos, quizzes) for prev/next + auto-advance.
  const curriculum = useMemo(() => {
    const items: CurriculumItem[] = [];
    const sortedSessions = [...sessions].sort((a, b) => a.session_order - b.session_order);
    for (const s of sortedSessions) {
      const chs = chapters
        .filter((c) => c.session_id === s.id)
        .sort((a, b) => a.chapter_order - b.chapter_order);
      if (chs.length === 0 && s.video_url) {
        items.push({ kind: "session", id: s.id, sessionId: s.id });
      } else {
        for (const c of chs) items.push({ kind: "chapter", id: c.id, sessionId: s.id });
      }
      const qs = sessionQuizzes
        .filter((q) => q.session_id === s.id && q.quiz)
        .sort((a, b) => a.display_order - b.display_order);
      for (const sq of qs) {
        items.push({ kind: "quiz", id: sq.quiz!.id, sessionId: s.id });
      }
    }
    return items;
  }, [sessions, chapters, sessionQuizzes]);

  const [searchParams, setSearchParams] = useSearchParams();

  // Default selection: honor ?chapter= / ?quiz= deep link, else first unwatched.
  useEffect(() => {
    if (selected || curriculum.length === 0) return;
    const qpChapter = searchParams.get("chapter");
    const qpQuiz = searchParams.get("quiz");

    if (qpQuiz) {
      const sq = sessionQuizzes.find((q) => q.quiz?.id === qpQuiz);
      if (sq) {
        setSelected({ kind: "quiz", id: qpQuiz });
        setCurrentSessionId(sq.session_id);
        const next = new URLSearchParams(searchParams);
        next.delete("quiz");
        setSearchParams(next, { replace: true });
        return;
      }
    }

    let target = qpChapter ? curriculum.find((it) => it.kind === "chapter" && it.id === qpChapter) : undefined;
    if (!target) {
      target =
        curriculum.find((it) => {
          if (it.kind === "chapter") return !chapterProgress[it.id]?.is_completed;
          if (it.kind === "quiz") return quizSubmissions[it.id] == null;
          return !sessionProgress[it.id];
        }) ?? curriculum[0];
    }
    setSelected({ kind: target.kind, id: target.id });
    setCurrentSessionId(target.sessionId);
    if (qpChapter) {
      const next = new URLSearchParams(searchParams);
      next.delete("chapter");
      setSearchParams(next, { replace: true });
    }
  }, [curriculum, selected, chapterProgress, sessionProgress, quizSubmissions, sessionQuizzes, searchParams, setSearchParams]);

  const currentChapter = selected?.kind === "chapter" ? (chapters.find((c) => c.id === selected.id) ?? null) : null;
  const currentSession = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === "session") return sessions.find((s) => s.id === selected.id) ?? null;
    if (selected.kind === "chapter") {
      const ch = chapters.find((c) => c.id === selected.id);
      return ch ? (sessions.find((s) => s.id === ch.session_id) ?? null) : null;
    }
    if (selected.kind === "quiz") {
      const sq = sessionQuizzes.find((q) => q.quiz?.id === selected.id);
      return sq ? (sessions.find((s) => s.id === sq.session_id) ?? null) : null;
    }
    if (selected.kind === "mini_project") {
      const mp = miniProjects.find((m) => m.id === selected.id);
      return mp ? (sessions.find((s) => s.id === mp.session_id) ?? null) : null;
    }
    return null;
  }, [selected, sessions, chapters, sessionQuizzes, miniProjects]);

  const nextSession = useMemo(() => {
    if (!currentSession) return null;
    const sorted = [...sessions].sort((a, b) => a.session_order - b.session_order);
    const idx = sorted.findIndex((s) => s.id === currentSession.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  }, [sessions, currentSession]);

  // Throttle progress writes without triggering re-renders of the player.
  const lastSavedSecRef = useRef<Record<string, number>>({});
  const completedChapterRef = useRef<Set<string>>(new Set());
  // Latest known playhead per chapter, updated on every onProgress tick
  // (not just the throttled 15s saves) so we can flush on switch/unmount.
  const currentTimeRef = useRef<Record<string, number>>({});

  // Fullscreen wrapper (contains video + countdown overlay)
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const { wrapperRef: playerWrapperRef, isFullscreen, toggleFullscreen } = useVideoFullscreen(liveVideoRef);

  // Auto-advance countdown after a video ends.
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentIdx = selected ? curriculum.findIndex((p) => p.kind === selected.kind && p.id === selected.id) : -1;

  const nextItem = currentIdx >= 0 ? curriculum[currentIdx + 1] : undefined;
  const nextItemTitle = useMemo(() => {
    if (!nextItem) return null;
    if (nextItem.kind === "chapter") return chapters.find((c) => c.id === nextItem.id)?.title ?? null;
    if (nextItem.kind === "quiz") {
      return sessionQuizzes.find((q) => q.quiz?.id === nextItem.id)?.quiz?.title ?? "Quiz";
    }
    return sessions.find((s) => s.id === nextItem.id)?.title ?? null;
  }, [nextItem, chapters, sessions, sessionQuizzes]);

  const nextSessionInfo = useMemo((): NextSessionInfo | null => {
    if (!nextItem || !nextItemTitle) return null;
    const type = nextItem.kind === "quiz" ? "quiz" : nextItem.kind === "chapter" ? "content" : "video";
    return { id: nextItem.id, title: nextItemTitle, type };
  }, [nextItem, nextItemTitle]);

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  };

  const go = (delta: number) => {
    if (currentIdx < 0) return;
    const next = curriculum[currentIdx + delta];
    if (!next) return;
    clearCountdown();
    setSelected({ kind: next.kind, id: next.id });
    setCurrentSessionId(next.sessionId);
  };

  const handleQuizCompleted = () => {
    load({ silent: true });
    if (curriculum[currentIdx + 1]) startAutoAdvance();
  };

  const startAutoAdvance = () => {
    if (!nextItem) return;
    clearCountdown();
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          go(1);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    },
    [],
  );

  // Cancel countdown when the user manually changes selection
  useEffect(() => {
    clearCountdown(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [selected?.id]);

  // Flush any unsaved watch time for the chapter being left, whether the
  // user switches chapters or navigates away entirely — otherwise up to
  // 14s of progress since the last throttled save is lost.
  useEffect(() => {
    return () => {
      if (selected?.kind !== "chapter") return;
      const chapterId = selected.id;
      if (completedChapterRef.current.has(chapterId)) return;
      const t = currentTimeRef.current[chapterId];
      if (t == null) return;
      const floor = Math.floor(t);
      const lastSaved = lastSavedSecRef.current[chapterId] ?? 0;
      if (floor <= lastSaved) return;
      lastSavedSecRef.current[chapterId] = floor;
      invokeFn("update-chapter-progress", {
        body: { chapter_id: chapterId, watched_seconds: floor, is_completed: false },
      });
    }; /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [selected]);

  const markChapterComplete = async (chapterId: string, watched: number, completed: boolean) => {
    if (!user) return;
    if (completed) completedChapterRef.current.add(chapterId);
    const optimistic = { is_completed: completed, watched_seconds: watched };
    const prev = chapterProgress[chapterId];
    setChapterProgress((p) => ({ ...p, [chapterId]: optimistic }));
    const res = await invokeFn("update-chapter-progress", {
      body: { chapter_id: chapterId, watched_seconds: watched, is_completed: completed },
    });
    if (res?.error) {
      if (completed) completedChapterRef.current.delete(chapterId);
      setChapterProgress((p) => {
        // Only roll back if a newer call hasn't already superseded this one.
        if (p[chapterId] !== optimistic) return p;
        return { ...p, [chapterId]: prev ?? { is_completed: false, watched_seconds: 0 } };
      });
      toast({ title: "Failed to save progress", description: res.error, variant: "destructive" });
    }
  };

  const submitRating = async (rating: number, comment: string) => {
    if (!course?.id) return;
    const res = await invokeFn("submit-course-rating", {
      body: { course_id: course.id, rating, comment },
    });
    if (res?.error) {
      toast({ title: "Failed to submit rating", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Rating saved" });
      setMyRating(rating);
      setMyComment(comment);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={buildLoginUrl(location.pathname + location.search)} replace />;
  }

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
        <Button onClick={() => navigate("/courses")}>Back to courses</Button>
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/courses")} className="gap-1 hidden sm:inline-flex">
          <LayoutGrid className="h-4 w-4" /> All courses
        </Button>
        <div className="flex-1 min-w-0 px-2 hidden md:block">
          <div className="text-sm font-medium truncate">{course.name}</div>
          {currentSession && (
            <div className="text-xs text-muted-foreground truncate">
              Session {currentSession.session_order}: {currentSession.title}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" onClick={() => go(-1)} disabled={currentIdx <= 0} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => go(1)}
            disabled={currentIdx < 0 || currentIdx >= curriculum.length - 1}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isEnrolled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRateOpen(true)}
              className="gap-1 ml-1 hidden md:inline-flex"
            >
              <Star className="h-4 w-4" /> Rate
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[300px_1fr] overflow-hidden">
        <CourseSidebar
          className="order-2 md:order-1"
          sessions={sessions}
          chapters={chapters}
          quizzes={sessionQuizzes}
          preReadings={preReadings}
          miniProjects={miniProjects}
          currentSessionId={currentSessionId ?? currentSession?.id ?? null}
          chapterProgress={chapterProgress}
          quizSubmissions={quizSubmissions}
          selected={selected}
          onSelect={(sel) => {
            setSelected(sel);
            let sid: string | undefined;
            if (sel.kind === "chapter") sid = chapters.find((c) => c.id === sel.id)?.session_id;
            else if (sel.kind === "mini_project") sid = miniProjects.find((m) => m.id === sel.id)?.session_id;
            else if (sel.kind === "quiz") sid = sessionQuizzes.find((q) => q.quiz?.id === sel.id)?.session_id;
            else sid = sel.id;
            if (sid) setCurrentSessionId(sid);
          }}
          onSelectSession={(sid) => {
            setCurrentSessionId(sid);
            const firstCh = chapters
              .filter((c) => c.session_id === sid)
              .sort((a, b) => a.chapter_order - b.chapter_order)[0];
            if (firstCh) setSelected({ kind: "chapter", id: firstCh.id });
            else {
              const s = sessions.find((x) => x.id === sid);
              if (s?.video_url) setSelected({ kind: "session", id: sid });
            }
          }}
          onOpenQuiz={(quizId) => {
            const sq = sessionQuizzes.find((q) => q.quiz?.id === quizId);
            if (sq) setCurrentSessionId(sq.session_id);
            setSelected({ kind: "quiz", id: quizId });
          }}
          onOpenMiniProject={(id) => {
            const mp = miniProjects.find((m) => m.id === id);
            if (mp) setCurrentSessionId(mp.session_id);
            setSelected({ kind: "mini_project", id });
          }}
          sessionProgress={sessionProgress}
          nextSession={nextSession}
        />

        {/* Main viewer */}
        <main className="order-1 md:order-2 min-h-0 h-full overflow-hidden relative">
          <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto p-4 space-y-4">
              {isEnrolled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRateOpen(true)}
                  className="gap-1 w-full justify-center md:hidden"
                >
                  <Star className="h-4 w-4" /> Rate this course
                </Button>
              )}
              {currentSession && (() => {
                const { total, completed, pct } = getSessionProgress(
                  chapters,
                  currentSession.id,
                  chapterProgress,
                  sessionProgress,
                );
                return (
                  <div className="md:hidden space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-medium truncate">Session {currentSession.session_order}</span>
                      <span className="text-muted-foreground shrink-0">
                        {total > 0 ? `${completed} of ${total} · ${pct}%` : `${pct}%`}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })()}
              {selected?.kind === "quiz" ? (
                (() => {
                  const sq = sessionQuizzes.find((q) => q.quiz?.id === selected.id);
                  const title = sq?.quiz?.title ?? "Quiz";
                  return (
                    <InlineQuiz
                      key={selected.id}
                      quizId={selected.id}
                      quizTitle={title}
                      onCompleted={handleQuizCompleted}
                    />
                  );
                })()
              ) : selected?.kind === "mini_project" ? (
                (() => {
                  const mp = miniProjects.find((m) => m.id === selected.id);
                  if (!mp) return null;
                  return (
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Mini-project</div>
                      <h1 className="text-xl font-semibold">{mp.title}</h1>
                      {mp.description ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mp.description}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No description provided.</p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <>
                  <div
                    ref={playerWrapperRef}
                    className={`relative isolate bg-black rounded-lg overflow-hidden group ${isFullscreen ? "w-screen h-screen rounded-none" : "aspect-video"}`}
                  >
                    {currentChapter?.can_watch && currentChapter.hls_url ? (
                      <HlsPlayer
                        key={currentChapter.id}
                        videoRef={liveVideoRef}
                        src={currentChapter.hls_url}
                        autoPlay
                        showControls={countdown === null}
                        className="relative z-0 w-full h-full bg-black"
                        onNearEnd={() => {
                          if (completedChapterRef.current.has(currentChapter.id)) return;
                          markChapterComplete(currentChapter.id, currentChapter.duration_seconds ?? 0, true);
                        }}
                        onEnded={() => {
                          if (!completedChapterRef.current.has(currentChapter.id)) {
                            markChapterComplete(currentChapter.id, currentChapter.duration_seconds ?? 0, true);
                          }
                          if (nextItem) startAutoAdvance();
                        }}
                        onProgress={(t) => {
                          currentTimeRef.current[currentChapter.id] = t;
                          if (completedChapterRef.current.has(currentChapter.id)) return;
                          const floor = Math.floor(t);
                          const prev = lastSavedSecRef.current[currentChapter.id] ?? 0;
                          if (floor - prev >= 15) {
                            lastSavedSecRef.current[currentChapter.id] = floor;
                            invokeFn("update-chapter-progress", {
                              body: { chapter_id: currentChapter.id, watched_seconds: floor, is_completed: false },
                            });
                          }
                        }}
                        onError={(msg) => toast({ title: "Video error", description: msg, variant: "destructive" })}
                      />
                    ) : selected?.kind === "session" && currentSession?.video_url ? (
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

                    {countdown !== null && nextSessionInfo && (
                      <NextSessionOverlay
                        nextSession={nextSessionInfo}
                        countdown={countdown}
                        onCancel={clearCountdown}
                        onStartNow={() => go(1)}
                        startLabel={nextItem?.kind === "quiz" ? "Start now" : "Play now"}
                      />
                    )}

                    {(currentChapter?.can_watch && currentChapter.hls_url) ||
                    (selected?.kind === "session" && currentSession?.video_url) ? (
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        className="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded bg-black/60 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-xl font-semibold">
                      {currentChapter ? currentChapter.title : currentSession?.title}
                    </h1>
                    {(currentChapter?.description || currentSession?.description) && (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {currentChapter?.description || currentSession?.description || ""}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </>
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
