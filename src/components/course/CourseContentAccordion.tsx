import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ClipboardList, Lock, Minus, Plus } from 'lucide-react';
import ChapterPreviewDialog from './ChapterPreviewDialog';
import { cn } from '@/lib/utils';

export interface CurriculumChapter {
  id: string;
  title: string;
  chapter_order: number;
  is_preview: boolean;
  hls_url: string | null;
}

export interface CurriculumQuiz {
  id: string;
  title: string;
}

export interface CurriculumSession {
  id: string;
  title: string;
  session_order: number;
  chapters: CurriculumChapter[];
  quizzes: CurriculumQuiz[];
}

interface Props {
  slug: string;
  isEnrolled: boolean;
  sessions: CurriculumSession[];
}

export default function CourseContentAccordion({ slug, isEnrolled, sessions }: Props) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ title: string; hlsUrl: string | null } | null>(null);

  const defaultOpen = useMemo(
    () => (sessions[0] ? [sessions[0].id] : []),
    [sessions]
  );

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Curriculum coming soon.</p>
    );
  }

  const openChapter = (c: CurriculumChapter) => {
    if (isEnrolled) {
      navigate(`/courses/${slug}/learn?chapter=${c.id}`);
    } else if (c.is_preview) {
      setPreview({ title: c.title, hlsUrl: c.hls_url });
    }
  };

  const openQuiz = (q: CurriculumQuiz) => {
    if (!isEnrolled) return;
    navigate(`/courses/${slug}/learn?quiz=${q.id}`);
  };

  return (
    <>
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full space-y-3">
        {sessions.map((s) => (
          <AccordionItem
            key={s.id}
            value={s.id}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <AccordionTrigger
              className={cn(
                'group/trigger px-4 py-3.5 hover:no-underline',
                '[&>svg:last-child]:hidden',
                'data-[state=closed]:bg-card data-[state=open]:bg-secondary',
              )}
            >
              <span className="flex items-center gap-3 text-left">
                <Plus className="h-4 w-4 shrink-0 text-primary group-data-[state=open]/trigger:hidden" />
                <Minus className="hidden h-4 w-4 shrink-0 text-primary group-data-[state=open]/trigger:block" />
                <span className="text-base font-semibold text-foreground">
                  Section {s.session_order}: {s.title}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-border bg-card pb-0">
              <ul className="divide-y divide-border">
                {s.chapters.map((c, idx) => {
                  const clickable = isEnrolled || c.is_preview;
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        'flex items-center justify-between gap-3 px-4 py-3',
                        clickable
                          ? 'cursor-pointer hover:bg-muted/50'
                          : 'text-muted-foreground',
                      )}
                      onClick={() => clickable && openChapter(c)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                          {idx + 1}
                        </span>
                        {!clickable && (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-sm">{c.title}</span>
                      </div>
                      {!isEnrolled && c.is_preview && (
                        <button
                          type="button"
                          className="shrink-0 rounded-full bg-info px-4 py-1 text-xs font-medium text-info-foreground transition-opacity hover:opacity-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChapter(c);
                          }}
                        >
                          Preview
                        </button>
                      )}
                    </li>
                  );
                })}
                {isEnrolled &&
                  s.quizzes.map((q) => (
                    <li
                      key={q.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/50"
                      onClick={() => openQuiz(q)}
                    >
                      <span className="w-6 shrink-0" />
                      <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">Quiz: {q.title}</span>
                    </li>
                  ))}
                {s.chapters.length === 0 && (!isEnrolled || s.quizzes.length === 0) && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    Content coming soon.
                  </li>
                )}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <ChapterPreviewDialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        title={preview?.title ?? ''}
        hlsUrl={preview?.hlsUrl ?? null}
      />
    </>
  );
}
