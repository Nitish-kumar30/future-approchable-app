import { CheckCircle2, PlayCircle, BookOpen, ClipboardList, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NEXT_SESSION_COUNTDOWN_SECONDS = 5;

export interface NextSessionInfo {
  id: string;
  title: string;
  type: string;
}

const typeIcons: Record<string, typeof PlayCircle> = {
  video: PlayCircle,
  reading: BookOpen,
  quiz: ClipboardList,
  content: PlayCircle,
  link: PlayCircle,
};

const typeLabels: Record<string, string> = {
  video: 'Video',
  reading: 'Reading',
  quiz: 'Quiz',
  content: 'Lesson',
  link: 'Resource',
};

export default function NextSessionOverlay({
  nextSession,
  countdown,
  onCancel,
  onStartNow,
}: {
  nextSession: NextSessionInfo | null;
  countdown: number;
  onCancel: () => void;
  onStartNow: () => void;
}) {
  const NextIcon = nextSession ? typeIcons[nextSession.type] || PlayCircle : CheckCircle2;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
      <div className="text-center px-8 py-6 max-w-sm w-full">
        {nextSession ? (
          <>
            <div className="relative w-16 h-16 mx-auto mb-5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  strokeDasharray={`${(countdown / NEXT_SESSION_COUNTDOWN_SECONDS) * 175.9} 175.9`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold">
                {countdown}
              </span>
            </div>

            <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Up next</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                <NextIcon className="h-3 w-3" />
                {typeLabels[nextSession.type] || 'Lesson'}
              </span>
            </div>
            <h3 className="text-white font-semibold text-base mb-6 leading-snug">{nextSession.title}</h3>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={onStartNow}>
                Start Now
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'hsl(142 71% 45% / 0.2)' }}
            >
              <CheckCircle2 className="h-8 w-8" style={{ color: 'hsl(142 71% 45%)' }} />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Course Complete!</h3>
            <p className="text-white/60 text-sm mb-6">You've finished all lessons in this course.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              Close
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
