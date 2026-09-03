import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CourseContentAccordion, { CurriculumSession } from '@/components/course/CourseContentAccordion';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

interface CourseCurriculumSectionProps {
  slug: string;
  isEnrolled: boolean;
  sessions: CurriculumSession[];
  completedChapterIds: Set<string>;
  completedQuizIds: Set<string>;
  chapterCount: number;
}

export default function CourseCurriculumSection({
  slug,
  isEnrolled,
  sessions,
  completedChapterIds,
  completedQuizIds,
  chapterCount,
}: CourseCurriculumSectionProps) {
  const allIds = sessions.map((s) => s.id);
  const [openIds, setOpenIds] = useState<string[]>(sessions[0] ? [sessions[0].id] : []);
  const allExpanded = sessions.length > 0 && openIds.length === allIds.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">Course Content</h2>
          {sessions.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
              {chapterCount > 0 && ` • ${chapterCount} ${chapterCount === 1 ? 'lesson' : 'lessons'}`}
            </p>
          )}
        </div>
        {sessions.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setOpenIds(allExpanded ? [] : allIds)}
          >
            {allExpanded ? (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center text-muted-foreground text-sm">
          No content available yet.
        </div>
      ) : (
        <CourseContentAccordion
          slug={slug}
          isEnrolled={isEnrolled}
          sessions={sessions}
          completedChapterIds={completedChapterIds}
          completedQuizIds={completedQuizIds}
          openSessionIds={openIds}
          onOpenSessionIdsChange={setOpenIds}
        />
      )}
    </div>
  );
}
