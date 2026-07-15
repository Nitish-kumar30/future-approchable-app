import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Play, ClipboardList, Lock } from 'lucide-react';
import ChapterPreviewDialog from './ChapterPreviewDialog';

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
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        {sessions.map((s) => (
          <AccordionItem key={s.id} value={s.id} className="border-b">
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="text-base font-semibold">
                Section {s.session_order}: {s.title}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="divide-y">
                {s.chapters.map((c, idx) => {
                  const clickable = isEnrolled || c.is_preview;
                  return (
                    <li
                      key={c.id}
                      className={
                        'flex items-center justify-between gap-3 py-2.5 pl-2 pr-1 ' +
                        (clickable
                          ? 'cursor-pointer rounded-md hover:bg-accent'
                          : 'text-muted-foreground')
                      }
                      onClick={() => clickable && openChapter(c)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                          {idx + 1}.
                        </span>
                        {clickable ? (
                          <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-sm">{c.title}</span>
                      </div>
                      {!isEnrolled && c.is_preview && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChapter(c);
                          }}
                        >
                          Preview
                        </Button>
                      )}
                    </li>
                  );
                })}
                {isEnrolled &&
                  s.quizzes.map((q) => (
                    <li
                      key={q.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md py-2.5 pl-2 pr-1 hover:bg-accent"
                      onClick={() => openQuiz(q)}
                    >
                      <span className="w-6 shrink-0" />
                      <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">Quiz: {q.title}</span>
                    </li>
                  ))}
                {s.chapters.length === 0 && (!isEnrolled || s.quizzes.length === 0) && (
                  <li className="py-2 text-sm text-muted-foreground">
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
