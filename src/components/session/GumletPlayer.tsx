import { useEffect, useRef } from 'react';
import { getVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import { attachPlayerJs, timeupdateSeconds } from '@/lib/playerJs';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { useEndOfVideoOverlay } from '@/components/session/useEndOfVideoOverlay';
import type { OnDemandPlayerProps } from '@/components/session/onDemandPlayerTypes';

export default function GumletPlayer({
  videoUrl,
  title,
  nextSession,
  onCompleted,
  onNextSession,
  autoPlay,
  onAutoPlayConsumed,
  onPlay,
}: OnDemandPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const { showOverlay, countdown, openOverlay, handleCancel, handleStartNow } = useEndOfVideoOverlay(
    nextSession,
    onNextSession,
  );

  const assetMatch = videoUrl.match(/(?:gumlet\.tv\/watch\/|play\.gumlet\.io\/embed\/)([a-zA-Z0-9]+)/i);
  const assetId = assetMatch?.[1] ?? null;
  const embedSrc = assetId
    ? `https://play.gumlet.io/embed/${assetId}?autoplay=${autoPlay ? 'true' : 'false'}`
    : null;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !assetId) return;

    completedFiredRef.current = false;
    playFiredRef.current = false;

    const player = attachPlayerJs(iframe);

    player.on('ready', () => {
      const prefs = getVideoPlaybackPrefs();
      try {
        player.setVolume?.(prefs.volume);
        player.setPlaybackRate?.(prefs.playbackRate);
      } catch {
        /* optional methods */
      }
      if (autoPlay) {
        try {
          player.play();
        } catch {
          /* autoplay may be blocked */
        }
      }
      onAutoPlayConsumed?.();
    });

    player.on('play', () => {
      if (!playFiredRef.current) {
        playFiredRef.current = true;
        onPlay?.();
      }
    });

    player.on('timeupdate', (data) => {
      const t = timeupdateSeconds(data);
      if (!t) return;
      if (!completedFiredRef.current && shouldMarkVideoComplete(t.seconds, t.duration)) {
        completedFiredRef.current = true;
        onCompleted();
      }
    });

    player.on('ended', () => {
      if (!completedFiredRef.current) {
        completedFiredRef.current = true;
        onCompleted();
      }
      openOverlay();
    });

    return () => player.destroy();
  }, [assetId]);

  if (!embedSrc) return null;

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
      <iframe
        ref={iframeRef}
        src={embedSrc}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title={title}
      />
      {showOverlay && (
        <NextSessionOverlay
          nextSession={nextSession}
          countdown={countdown}
          onCancel={handleCancel}
          onStartNow={handleStartNow}
        />
      )}
    </div>
  );
}
