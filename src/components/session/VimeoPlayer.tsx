import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Player from '@vimeo/player';
import { getVideoPlaybackPrefs, saveVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import CohortUpsellCard from '@/components/session/CohortUpsellCard';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { InspectShield } from '@/components/session/InspectShield';
import { useEndOfVideoOverlay } from '@/components/session/useEndOfVideoOverlay';
import type { OnDemandPlayerProps } from '@/components/session/onDemandPlayerTypes';
import { Button } from '@/components/ui/button';

export default function VimeoPlayer({
  videoUrl,
  nextSession,
  onCompleted,
  onNextSession,
  autoPlay,
  onAutoPlayConsumed,
  onPlay,
  showUpsellOverlay,
}: OnDemandPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const [upsellVisible, setUpsellVisible] = useState(!!showUpsellOverlay);
  const upsellDismissedRef = useRef(false);
  const { showOverlay, countdown, openOverlay, handleCancel, handleStartNow } = useEndOfVideoOverlay(
    nextSession,
    onNextSession,
  );

  useEffect(() => {
    if (showUpsellOverlay && !upsellDismissedRef.current) {
      setUpsellVisible(true);
    } else if (!showUpsellOverlay) {
      setUpsellVisible(false);
    }
  }, [showUpsellOverlay]);

  const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const vimeoId = vimeoMatch ? vimeoMatch[1] : null;

  useEffect(() => {
    if (!containerRef.current || !vimeoId) return;

    completedFiredRef.current = false;
    playFiredRef.current = false;

    const player = new Player(containerRef.current, {
      id: parseInt(vimeoId, 10),
      responsive: true,
      title: false,
      byline: false,
      portrait: false,
      autoplay: !!autoPlay,
      speed: true,
    });

    player
      .ready()
      .then(async () => {
        const prefs = getVideoPlaybackPrefs();
        try {
          await player.setVolume(prefs.volume);
          await player.setPlaybackRate(prefs.playbackRate);
        } catch {
          /* ignore unsupported volume/rate on some mobile browsers */
        }
        if (autoPlay) {
          try {
            await player.play();
          } catch {
            /* autoplay may be blocked */
          }
        }
        onAutoPlayConsumed?.();
      })
      .catch(() => {});

    player.on('volumechange', (data: { volume: number }) => {
      saveVideoPlaybackPrefs({ volume: data.volume });
    });
    player.on('playbackratechange', (data: { playbackRate: number }) => {
      saveVideoPlaybackPrefs({ playbackRate: data.playbackRate });
    });

    player.on('play', () => {
      if (!playFiredRef.current) {
        playFiredRef.current = true;
        onPlay?.();
      }
    });

    player.on('timeupdate', (data: { seconds: number; duration: number }) => {
      if (!completedFiredRef.current && shouldMarkVideoComplete(data.seconds, data.duration)) {
        completedFiredRef.current = true;
        onCompleted();
      }
    });

    player.on('ended', () => {
      openOverlay();
    });

    return () => {
      player.destroy().catch(() => {});
    };
  }, [vimeoId]);

  if (!vimeoId) return null;

  return (
    <InspectShield className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
      <div ref={containerRef} className="w-full h-full" />

      {upsellVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20 overflow-y-auto p-3">
          <div className="max-w-xs w-full space-y-3">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              <CohortUpsellCard variant="mid-course" />
            </div>
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUpsellVisible(false);
                  upsellDismissedRef.current = true;
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-1 text-xs h-7"
              >
                <X className="h-3 w-3" /> Continue Watching
              </Button>
            </div>
          </div>
        </div>
      )}

      {showOverlay && (
        <NextSessionOverlay
          nextSession={nextSession}
          countdown={countdown}
          onCancel={handleCancel}
          onStartNow={handleStartNow}
        />
      )}
    </InspectShield>
  );
}
