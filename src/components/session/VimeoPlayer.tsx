import { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { CheckCircle2, PlayCircle, BookOpen, ClipboardList, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CohortUpsellCard from '@/components/session/CohortUpsellCard';

interface NextSession {
  id: string;
  title: string;
  type: string;
}

interface VimeoPlayerProps {
  videoUrl: string;
  title: string;
  nextSession: NextSession | null;
  onCompleted: () => void;
  onNextSession: () => void;
  autoPlay?: boolean;
  onAutoPlayConsumed?: () => void;
  onPlay?: () => void;
  showUpsellOverlay?: boolean;
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

export default function VimeoPlayer({ videoUrl, title, nextSession, onCompleted, onNextSession, autoPlay, onAutoPlayConsumed, onPlay, showUpsellOverlay }: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [upsellVisible, setUpsellVisible] = useState(!!showUpsellOverlay);
  const upsellDismissedRef = useRef(false);

  // Extract Vimeo video ID
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  const vimeoId = vimeoMatch ? vimeoMatch[1] : null;

  useEffect(() => {
    if (!containerRef.current || !vimeoId) return;

    // Reset state when video changes
    completedFiredRef.current = false;
    playFiredRef.current = false;
    setShowOverlay(false);
    setCountdown(5);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const player = new Player(containerRef.current, {
      id: parseInt(vimeoId),
      responsive: true,
      title: false,
      byline: false,
      portrait: false,
      autoplay: !!autoPlay,
    });

    playerRef.current = player;

    // Notify parent that autoplay has been consumed so it doesn't persist
    player.ready().then(() => {
      onAutoPlayConsumed?.();
    }).catch(() => {});

    // Fire onPlay callback on first play event
    player.on('play', () => {
      if (!playFiredRef.current) {
        playFiredRef.current = true;
        onPlay?.();
      }
    });

    // 20-second rule: mark complete when ≤20s remaining
    player.on('timeupdate', (data: { seconds: number; duration: number }) => {
      if (!completedFiredRef.current && data.duration > 0 && (data.duration - data.seconds) <= 20) {
        completedFiredRef.current = true;
        onCompleted();
      }
    });

    // Show popup when video ends
    player.on('ended', () => {
      setShowOverlay(true);
      setCountdown(5);
    });

    return () => {
      player.destroy().catch(() => {});
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [vimeoId]);

  // Countdown timer
  useEffect(() => {
    if (!showOverlay) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    if (!nextSession) return; // Don't auto-advance on last session

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          onNextSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showOverlay, nextSession]);

  const handleCancel = () => {
    setShowOverlay(false);
    setCountdown(5);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handleStartNow = () => {
    setShowOverlay(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onNextSession();
  };

  // If not a Vimeo URL, fall back to iframe
  if (!vimeoId) {
    const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const embedUrl = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : null;
    if (embedUrl) {
      return (
        <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
          <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={title} />
        </div>
      );
    }
    return null;
  }

  const NextIcon = nextSession ? (typeIcons[nextSession.type] || PlayCircle) : CheckCircle2;

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
      {/* Vimeo player container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Mid-course upsell overlay */}
      {upsellVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div className="max-w-sm w-full px-4">
            <CohortUpsellCard variant="mid-course" />
            <div className="flex justify-center mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setUpsellVisible(false); upsellDismissedRef.current = true; }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-1"
              >
                <X className="h-3.5 w-3.5" /> Continue Watching
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End-of-video overlay */}
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
          <div className="text-center px-8 py-6 max-w-sm w-full">
            {nextSession ? (
              <>
                {/* Countdown circle */}
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="28"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="4"
                      strokeDasharray={`${(countdown / 5) * 175.9} 175.9`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold">{countdown}</span>
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
                    onClick={handleCancel}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleStartNow}>
                    Start Now
                  </Button>
                </div>
              </>
            ) : (
              /* Last session - course complete */
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'hsl(142 71% 45% / 0.2)' }}>
                  <CheckCircle2 className="h-8 w-8" style={{ color: 'hsl(142 71% 45%)' }} />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Course Complete!</h3>
                <p className="text-white/60 text-sm mb-6">You've finished all lessons in this course.</p>
                <Button variant="outline" size="sm" onClick={handleCancel} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
