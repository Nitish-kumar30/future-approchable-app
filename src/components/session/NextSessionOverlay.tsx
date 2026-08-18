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
  startLabel = 'Start Now',
}: {
  nextSession: NextSessionInfo | null;
  countdown: number;
  onCancel: () => void;
  onStartNow: () => void;
  startLabel?: string;
}) {
  const NextIcon = nextSession ? typeIcons[nextSession.type] || PlayCircle : CheckCircle2;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="text-center px-4 py-3 sm:px-8 sm:py-6 max-w-sm w-full max-h-full">
        {nextSession ? (
          <>
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-5">
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
              <span className="absolute inset-0 flex items-center justify-center text-white text-lg sm:text-xl font-bold">
                {countdown}
              </span>
            </div>

            <p className="text-white/60 text-[10px] sm:text-xs uppercase tracking-widest mb-1 sm:mb-2">Up next</p>
            <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
              <span className="inline-flex items-center gap-1 bg-primary/20 text-primary text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium">
                <NextIcon className="h-3 w-3" />
                {typeLabels[nextSession.type] || 'Lesson'}
              </span>
            </div>
            <h3 className="text-white font-semibold text-sm sm:text-base mb-3 sm:mb-6 leading-snug line-clamp-2">
              {nextSession.title}
            </h3>

            <div className="flex gap-2 sm:gap-3 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={onStartNow} className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm">
                {startLabel}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-5"
              style={{ background: 'hsl(142 71% 45% / 0.2)' }}
            >
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: 'hsl(142 71% 45%)' }} />
            </div>
            <h3 className="text-white font-bold text-lg sm:text-xl mb-2">Course Complete!</h3>
            <p className="text-white/60 text-xs sm:text-sm mb-3 sm:mb-6">You've finished all lessons in this course.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              Close
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
