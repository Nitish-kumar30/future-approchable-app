import { supabase } from '@/integrations/supabase/client';
import { isVideoUrl } from '@/lib/recordingVideo';

interface OnDemandCourseRef {
  id: string;
  slug: string;
  name: string;
}

export interface OnDemandSessionRef {
  id: string;
  recording_url: string | null;
  session_order: number | null;
}

export interface OnDemandLearningItem {
  courseId: string;
  slug: string;
  name: string;
  percent: number;
  lastChapterTitle: string | null;
  resumeSessionId: string | null;
  isOnDemand: true;
}

function isTrackableSession(
  session: OnDemandSessionRef,
  quizSessionIds: Set<string>,
): boolean {
  return (session.recording_url && isVideoUrl(session.recording_url)) || quizSessionIds.has(session.id);
}

function orderedTrackableSessions(
  sessions: OnDemandSessionRef[],
  quizSessionIds: Set<string>,
): OnDemandSessionRef[] {
  return [...sessions]
    .sort((a, b) => (a.session_order ?? 0) - (b.session_order ?? 0))
    .filter((s) => isTrackableSession(s, quizSessionIds));
}

/** First incomplete trackable session in playlist order, or first trackable as fallback. */
export function getResumeSessionId(
  sessions: OnDemandSessionRef[],
  completedSessionIds: Set<string>,
  quizSessionIds: Set<string>,
): string | null {
  const trackable = orderedTrackableSessions(sessions, quizSessionIds);
  if (trackable.length === 0) return null;
  const incomplete = trackable.find((s) => !completedSessionIds.has(s.id));
  return incomplete?.id ?? trackable[0].id;
}

async function fetchOnDemandSessionContext(
  userId: string,
  courseIds: string[],
): Promise<{
  sessions: Array<OnDemandSessionRef & { title?: string; course_id: string }>;
  quizSessionIds: Set<string>;
  completedSessionIds: Set<string>;
  completedAtBySession: Map<string, string>;
}> {
  if (courseIds.length === 0) {
    return {
      sessions: [],
      quizSessionIds: new Set(),
      completedSessionIds: new Set(),
      completedAtBySession: new Map(),
    };
  }

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

  return {
    sessions: sessions || [],
    quizSessionIds,
    completedSessionIds,
    completedAtBySession,
  };
}

/** Session-level progress for free / on-demand courses (no chapters). */
export async function computeOnDemandProgressPercents(
  userId: string,
  courseIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (courseIds.length === 0) return result;

  const { sessions, quizSessionIds, completedSessionIds } = await fetchOnDemandSessionContext(
    userId,
    courseIds,
  );

  if (sessions.length === 0) {
    courseIds.forEach((id) => result.set(id, 0));
    return result;
  }

  for (const courseId of courseIds) {
    const courseSessions = sessions.filter((s) => s.course_id === courseId);
    const trackable = orderedTrackableSessions(courseSessions, quizSessionIds);
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

export async function fetchOnDemandResumeSessionIds(
  userId: string,
  courseIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (courseIds.length === 0) return result;

  const { sessions, quizSessionIds, completedSessionIds } = await fetchOnDemandSessionContext(
    userId,
    courseIds,
  );

  for (const courseId of courseIds) {
    const courseSessions = sessions.filter((s) => s.course_id === courseId);
    const resumeId = getResumeSessionId(courseSessions, completedSessionIds, quizSessionIds);
    if (resumeId) result.set(courseId, resumeId);
  }

  return result;
}

export async function fetchOnDemandLearningItems(
  userId: string,
  courses: OnDemandCourseRef[],
): Promise<OnDemandLearningItem[]> {
  if (courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);
  const { sessions, quizSessionIds, completedSessionIds, completedAtBySession } =
    await fetchOnDemandSessionContext(userId, courseIds);

  return courses.map((course) => {
    const courseSessions = sessions.filter((s) => s.course_id === course.id);
    const trackable = orderedTrackableSessions(courseSessions, quizSessionIds);
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
        lastTitle = s.title ?? null;
      }
    }

    const resumeSessionId = getResumeSessionId(courseSessions, completedSessionIds, quizSessionIds);

    return {
      courseId: course.id,
      slug: course.slug,
      name: course.name,
      percent,
      lastChapterTitle: lastTitle,
      resumeSessionId,
      isOnDemand: true as const,
    };
  });
}
