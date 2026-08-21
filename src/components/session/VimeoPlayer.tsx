import { useEffect, useRef } from 'react';
import Player from '@vimeo/player';
import { getVideoPlaybackPrefs, saveVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { InspectShield } from '@/components/session/InspectShield';
import { useEndOfVideoOverlay } from '@/components/session/useEndOfVideoOverlay';
import type { OnDemandPlayerProps } from '@/components/session/onDemandPlayerTypes';

export default function VimeoPlayer({
  videoUrl,
  nextSession,
  onCompleted,
  onNextSession,
  autoPlay,
  onAutoPlayConsumed,
  onPlay,
}: OnDemandPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const { showOverlay, countdown, openOverlay, handleCancel, handleStartNow } = useEndOfVideoOverlay(
    nextSession,
    onNextSession,
  );

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
    <InspectShield className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
      <div ref={containerRef} className="w-full h-full" />

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
