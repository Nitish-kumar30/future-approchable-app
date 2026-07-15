import { CheckCircle2, Circle, Play, Lock, FileQuestion, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface CS_Session { id: string; title: string; session_order: number; video_url: string | null; is_content_unlocked: boolean; }
export interface CS_Chapter { id: string; session_id: string; title: string; chapter_order: number; can_watch: boolean; duration_seconds: number | null; is_preview: boolean; }
export interface CS_Quiz { session_id: string; quiz: { id: string; title: string } | null; display_order: number; }

interface Props {
  sessions: CS_Session[];
  chapters: CS_Chapter[];
  quizzes: CS_Quiz[];
  currentSessionId: string | null;
  chapterProgress: Record<string, { is_completed: boolean }>;
  quizSubmissions: Record<string, number | null>;
  selected: { kind: 'chapter' | 'session'; id: string } | null;
  onSelect: (s: { kind: 'chapter' | 'session'; id: string }) => void;
  onSelectSession: (sessionId: string) => void;
  onOpenQuiz: (quizId: string) => void;
  overallPct: number;
}

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return 'Video';
  const m = Math.round(sec / 60);
  return `Video · ${m}m`;
}

export default function CourseSidebar({
  sessions, chapters, quizzes, currentSessionId, chapterProgress, quizSubmissions,
  selected, onSelect, onSelectSession, onOpenQuiz, overallPct,
}: Props) {
  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? sessions[0];
  const chs = chapters
    .filter((c) => c.session_id === currentSession?.id)
    .sort((a, b) => a.chapter_order - b.chapter_order);
  const qs = quizzes.filter((q) => q.session_id === currentSession?.id);

  return (
    <aside className="flex flex-col h-full border-r bg-card">
      {/* Session picker */}
      <div className="p-4 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-start justify-between gap-2 text-left group">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Session {(currentSession?.session_order ?? 0) + 1}</div>
                <div className="font-semibold text-sm leading-snug line-clamp-2">
                  {currentSession?.title}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {sessions.map((s) => (
              <DropdownMenuItem key={s.id} onSelect={() => onSelectSession(s.id)}>
                <span className="text-xs text-muted-foreground mr-2">S{s.session_order + 1}</span>
                <span className="truncate">{s.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {chs.length === 0 && currentSession?.video_url && (
          <SidebarRow
            active={selected?.kind === 'session' && selected.id === currentSession.id}
            onClick={() => onSelect({ kind: 'session', id: currentSession.id })}
            icon={<Play className="h-4 w-4" />}
            title="Watch session"
            subtitle="Video"
          />
        )}
        {chs.map((c) => {
          const done = chapterProgress[c.id]?.is_completed;
          const active = selected?.kind === 'chapter' && selected.id === c.id;
          const icon = !c.can_watch
            ? <Lock className="h-4 w-4 text-muted-foreground" />
            : done
              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
              : active
                ? <Play className="h-4 w-4 text-primary" />
                : <Circle className="h-4 w-4 text-muted-foreground" />;
          return (
            <SidebarRow
              key={c.id}
              active={active}
              onClick={() => onSelect({ kind: 'chapter', id: c.id })}
              icon={icon}
              title={c.title}
              subtitle={formatDuration(c.duration_seconds)}
              badge={c.is_preview ? 'Preview' : undefined}
            />
          );
        })}
        {qs.map((sq) => sq.quiz && (
          <SidebarRow
            key={sq.quiz.id}
            active={false}
            onClick={() => onOpenQuiz(sq.quiz!.id)}
            icon={<FileQuestion className="h-4 w-4" />}
            title={sq.quiz.title}
            subtitle="Quiz"
            badge={quizSubmissions[sq.quiz.id] != null ? 'Done' : undefined}
          />
        ))}
      </div>

      {/* Footer: overall course progress */}
      <div className="p-4 border-t space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Course</span>
          <span className="text-muted-foreground">{overallPct}%</span>
        </div>
        <Progress value={overallPct} className="h-1.5" />
      </div>
    </aside>
  );
}

function SidebarRow({
  active, onClick, icon, title, subtitle, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-muted/60 transition border-l-2',
        active ? 'bg-muted border-primary' : 'border-transparent'
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={cn('block text-sm leading-snug', active && 'font-medium text-primary')}>
          {title}
        </span>
        {subtitle && <span className="block text-xs text-muted-foreground mt-0.5">{subtitle}</span>}
      </span>
      {badge && (
        <span className="text-[10px] font-medium text-blue-600 mt-0.5">{badge}</span>
      )}
    </button>
  );
}
