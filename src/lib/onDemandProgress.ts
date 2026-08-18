import { supabase } from '@/integrations/supabase/client';
import { isVideoUrl } from '@/lib/recordingVideo';

interface OnDemandCourseRef {
  id: string;
  slug: string;
  name: string;
}

export interface OnDemandLearningItem {
  courseId: string;
  slug: string;
  name: string;
  percent: number;
  lastChapterTitle: string | null;
  isOnDemand: true;
}

/** Session-level progress for free / on-demand courses (no chapters). */
export async function computeOnDemandProgressPercents(
  userId: string,
  courseIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (courseIds.length === 0) return result;

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, recording_url, course_id')
    .in('course_id', courseIds)
    .order('session_order', { ascending: true });

  const sessionIds = (sessions || []).map((s) => s.id);
  if (sessionIds.length === 0) {
    courseIds.forEach((id) => result.set(id, 0));
    return result;
  }

  const [{ data: quizRows }, { data: progressRows }] = await Promise.all([
    supabase.from('session_quizzes').select('session_id').in('session_id', sessionIds),
    supabase
      .from('session_progress')
      .select('session_id')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .in('session_id', sessionIds),
  ]);

  const quizSessionIds = new Set((quizRows || []).map((q) => q.session_id));
  const completedSessionIds = new Set((progressRows || []).map((p) => p.session_id));

  for (const courseId of courseIds) {
    const courseSessions = (sessions || []).filter((s) => s.course_id === courseId);
    const trackable = courseSessions.filter(
      (s) => (s.recording_url && isVideoUrl(s.recording_url)) || quizSessionIds.has(s.id),
    );
    const percent =
      trackable.length > 0
        ? Math.round(
            (trackable.filter((s) => completedSessionIds.has(s.id)).length / trackable.length) * 100,
          )
        : 0;
    result.set(courseId, percent);
  }

  return result;
}

export async function fetchOnDemandLearningItems(
  userId: string,
  courses: OnDemandCourseRef[],
): Promise<OnDemandLearningItem[]> {
  if (courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, title, session_order, recording_url, course_id')
    .in('course_id', courseIds)
    .order('session_order', { ascending: true });

  const sessionIds = (sessions || []).map((s) => s.id);

  const [{ data: quizRows }, { data: progressRows }] = await Promise.all([
    sessionIds.length > 0
      ? supabase.from('session_quizzes').select('session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    sessionIds.length > 0
      ? supabase
          .from('session_progress')
          .select('session_id, is_completed, completed_at')
          .eq('user_id', userId)
          .eq('is_completed', true)
          .in('session_id', sessionIds)
      : Promise.resolve({
          data: [] as { session_id: string; is_completed: boolean; completed_at: string | null }[],
        }),
  ]);

  const quizSessionIds = new Set((quizRows || []).map((q) => q.session_id));
  const completedAtBySession = new Map(
    (progressRows || []).map((p) => [p.session_id, p.completed_at ?? '']),
  );
  const completedSessionIds = new Set(completedAtBySession.keys());

  return courses.map((course) => {
    const courseSessions = (sessions || []).filter((s) => s.course_id === course.id);
    const trackable = courseSessions.filter(
      (s) => (s.recording_url && isVideoUrl(s.recording_url)) || quizSessionIds.has(s.id),
    );
    const percent =
      trackable.length > 0
        ? Math.round(
            (trackable.filter((s) => completedSessionIds.has(s.id)).length / trackable.length) * 100,
          )
        : 0;

    let lastTitle: string | null = null;
    let lastCompletedAt = '';
    for (const s of courseSessions) {
      const completedAt = completedAtBySession.get(s.id);
      if (completedAt && completedAt > lastCompletedAt) {
        lastCompletedAt = completedAt;
        lastTitle = s.title;
      }
    }

    return {
      courseId: course.id,
      slug: course.slug,
      name: course.name,
      percent,
      lastChapterTitle: lastTitle,
      isOnDemand: true as const,
    };
  });
}
