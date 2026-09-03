import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildLoginUrl, guideCoursePath } from '@/lib/authRedirect';
import PublicHeader from '@/components/layout/PublicHeader';
import { Markdown } from '@/components/ui/markdown';
import FeedbackDialog from '@/components/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Lock,
  UserPlus,
  LogIn,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string | null;
  mentor_name: string | null;
  duration: string | null;
  image_url: string | null;
}

interface GuideChapter {
  id: string;
  title: string;
  content_markdown: string;
  chapter_order: number;
}

export default function GuideCourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<GuideChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedChapterIds, setCompletedChapterIds] = useState<Set<string>>(new Set());
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const initialChapterResolvedRef = useRef(false);
  const autoEnrolledRef = useRef(false);

  const fetchCourseData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);

    const { data: courseData } = await supabase
      .from('courses')
      .select('id, name, description, mentor_name, duration, image_url')
      .eq('slug', slug)
      .eq('is_text_course', true)
      .eq('is_published', true)
      .single();

    if (!courseData) {
      setIsLoading(false);
      return;
    }
    setCourse(courseData);

    const { data: chapterData } = await supabase
      .from('guide_chapters')
      .select('id, title, content_markdown, chapter_order')
      .eq('course_id', courseData.id)
      .order('chapter_order', { ascending: true });

    setChapters(chapterData || []);
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    initialChapterResolvedRef.current = false;
    setActiveChapterId(null);
    autoEnrolledRef.current = false;
    fetchCourseData();
  }, [fetchCourseData]);

  const fetchProgress = useCallback(async (chapterIds: string[]) => {
    if (!user || chapterIds.length === 0) return;
    const { data } = await supabase
      .from('guide_chapter_progress')
      .select('guide_chapter_id')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .in('guide_chapter_id', chapterIds);

    if (data) {
      setCompletedChapterIds(new Set(data.map((p) => p.guide_chapter_id)));
    }
  }, [user]);

  useEffect(() => {
    if (user && chapters.length > 0) {
      fetchProgress(chapters.map((c) => c.id));
    }
  }, [user, chapters, fetchProgress]);

  useEffect(() => {
    if (initialChapterResolvedRef.current || chapters.length === 0) return;

    const qp = searchParams.get('chapter');
    const validQp = qp && chapters.some((c) => c.id === qp) ? qp : null;
    const firstIncomplete = chapters.find((c) => !completedChapterIds.has(c.id));
    const targetId = validQp ?? firstIncomplete?.id ?? chapters[0]?.id ?? null;

    setActiveChapterId(targetId);
    initialChapterResolvedRef.current = true;

    if (validQp) {
      const next = new URLSearchParams(searchParams);
      next.delete('chapter');
      setSearchParams(next, { replace: true });
    }
  }, [chapters, completedChapterIds, searchParams, setSearchParams]);

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
    }
  }, [user, course]);

  useEffect(() => {
    if (user && course) handleAutoEnroll();
  }, [user, course, handleAutoEnroll]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId);
  const activeIndex = chapters.findIndex((c) => c.id === activeChapterId);
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : null;
  const nextChapter = activeIndex >= 0 && activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : null;

  const completedCount = chapters.filter((c) => completedChapterIds.has(c.id)).length;
  const completionPercent = chapters.length > 0 ? Math.round((completedCount / chapters.length) * 100) : 0;

  const markComplete = async () => {
    if (!user || !activeChapterId || completedChapterIds.has(activeChapterId)) return;
    setMarkingComplete(true);
    await supabase.from('guide_chapter_progress').upsert(
      {
        user_id: user.id,
        guide_chapter_id: activeChapterId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,guide_chapter_id' },
    );
    setCompletedChapterIds((prev) => new Set([...prev, activeChapterId]));
    setMarkingComplete(false);
  };

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
          <h2 className="text-2xl font-bold mb-4">Guide not found</h2>
          <Button asChild>
            <Link to="/courses?tab=guides">
              <ChevronLeft className="mr-2 h-4 w-4" />Back to Guides
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const headerBlock = (
    <div className="p-4 border-b border-border shrink-0">
      <Link
        to="/courses?tab=guides"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
      >
        <ChevronLeft className="h-3 w-3" /> Back to Guides
      </Link>
      <h1 className="text-lg font-display font-bold text-foreground leading-tight">{course.name}</h1>
      {course.mentor_name && (
        <p className="text-xs text-muted-foreground mt-1">by {course.mentor_name}</p>
      )}
      {user && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFeedbackOpen(true)}
          className="gap-1.5 mt-2 -ml-2 text-xs h-7 px-2"
        >
          <MessageSquare className="h-3 w-3" /> Feedback
        </Button>
      )}
    </div>
  );

  const chapterListItems = chapters.map((chapter, idx) => {
    const isActive = activeChapterId === chapter.id;
    const isCompleted = completedChapterIds.has(chapter.id);

    return (
      <button
        key={chapter.id}
        onClick={() => setActiveChapterId(chapter.id)}
        className={`w-full text-left rounded-lg px-3 py-3 flex items-start gap-3 transition-colors ${
          isActive
            ? 'bg-primary/10 text-foreground border-l-2 border-primary'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className={`mt-0.5 shrink-0 ${isActive ? 'text-primary' : ''}`}>
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium leading-snug ${isActive ? 'text-foreground' : ''}`}>
            {idx + 1}. {chapter.title}
          </p>
        </div>
        {user && isCompleted && (
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(142 71% 45%)' }} />
        )}
      </button>
    );
  });

  const chapterListDesktop = (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Chapters ({chapters.length})
        </h2>
        {chapterListItems}
      </div>
    </ScrollArea>
  );

  const chapterListMobile = (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Chapters ({chapters.length})
      </h3>
      <div className="space-y-1">{chapterListItems}</div>
    </div>
  );

  const progressBlockDesktop = user && chapters.length > 0 && (
    <div className="p-4 border-t border-border bg-card shrink-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground font-medium">Your progress</span>
        <span className="text-xs font-semibold text-foreground">{completionPercent}%</span>
      </div>
      <Progress value={completionPercent} className="h-2" />
      <p className="text-xs text-muted-foreground mt-1.5">
        {completedCount} of {chapters.length} chapters completed
      </p>
    </div>
  );

  const progressBlockMobile = user && chapters.length > 0 && (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground font-medium">Your progress</span>
        <span className="text-xs font-semibold text-foreground">{completionPercent}%</span>
      </div>
      <Progress value={completionPercent} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {completedCount} of {chapters.length} chapters completed
      </p>
    </div>
  );

  const contentBlock = activeChapter ? (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold">{activeChapter.title}</h2>
      <Markdown content={activeChapter.content_markdown} />

      {user && !completedChapterIds.has(activeChapter.id) && (
        <Button onClick={markComplete} disabled={markingComplete} variant="outline" size="sm">
          {markingComplete ? 'Saving...' : 'Mark as complete'}
        </Button>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-border">
        {prevChapter ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveChapterId(prevChapter.id)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
        ) : (
          <div />
        )}
        {nextChapter ? (
          <Button size="sm" onClick={() => setActiveChapterId(nextChapter.id)} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  ) : (
    <div className="text-center py-16 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No chapters available for this guide yet.</p>
    </div>
  );

  const authOverlay = !user ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-display font-bold mb-2">Sign in to continue reading</h3>
        <p className="text-muted-foreground mb-2 text-sm">{course.name}</p>
        <p className="text-muted-foreground mb-6 text-sm">
          Create a free account to access all guide content.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to={slug ? buildLoginUrl(guideCoursePath(slug), { tab: 'signup' }) : '/login?tab=signup'}>
              <UserPlus className="mr-2 h-4 w-4" /> Sign Up Free
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={slug ? buildLoginUrl(guideCoursePath(slug)) : '/login'}>
              <LogIn className="mr-2 h-4 w-4" /> Log In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      {isMobile ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <aside className="border-b border-border bg-card shrink-0 flex flex-col">
            {headerBlock}
          </aside>
          <div className="flex-1 relative">
            {authOverlay}
            <div className={`p-3 space-y-6 ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
              {progressBlockMobile}
              {contentBlock}
              {chapterListMobile}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-row h-[calc(100vh-4rem)] overflow-hidden">
          <aside className="md:w-80 lg:w-96 md:border-r border-border bg-card shrink-0 flex flex-col">
            {headerBlock}
            {chapterListDesktop}
            {progressBlockDesktop}
          </aside>
          <div className="flex-1 relative overflow-hidden">
            {authOverlay}
            <div
              className={`h-full overflow-y-auto p-3 md:p-6 ${!user ? 'filter blur-sm pointer-events-none select-none' : ''}`}
            >
              <div className="max-w-4xl">{contentBlock}</div>
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
    </div>
  );
}
