import { useEffect, useRef } from 'react';
import { Player } from '@gumlet/player.js';
import { getVideoPlaybackPrefs, saveVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { InspectShield } from '@/components/session/InspectShield';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  const onPlayRef = useRef(onPlay);
  const onAutoPlayConsumedRef = useRef(onAutoPlayConsumed);
  const openOverlayRef = useRef<() => void>(() => {});

  const { showOverlay, countdown, openOverlay, handleCancel, handleStartNow } = useEndOfVideoOverlay(
    nextSession,
    onNextSession,
  );

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onPlayRef.current = onPlay;
    onAutoPlayConsumedRef.current = onAutoPlayConsumed;
    openOverlayRef.current = openOverlay;
  }, [onCompleted, onPlay, onAutoPlayConsumed, openOverlay]);

  const assetMatch = videoUrl.match(/(?:gumlet\.tv\/watch\/|play\.gumlet\.io\/embed\/)([a-zA-Z0-9]+)/i);
  const assetId = assetMatch?.[1] ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !assetId) return;

    completedFiredRef.current = false;
    playFiredRef.current = false;

    const shouldAutoPlay = autoPlay;

    // Create iframe via JS so player.js can attach before/during load (Gumlet docs).
    const iframe = document.createElement('iframe');
    iframe.src = `https://play.gumlet.io/embed/${assetId}?autoplay=${shouldAutoPlay ? 'true' : 'false'}`;
    iframe.className = 'w-full h-full';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.title = title;
    container.appendChild(iframe);

    const player = new Player(iframe);

    const onPlayHandler = () => {
      if (!playFiredRef.current) {
        playFiredRef.current = true;
        onPlayRef.current?.();
      }
    };

    const onTimeupdateHandler = (data: { seconds?: number; duration?: number }) => {
      const seconds = data?.seconds;
      const duration = data?.duration;
      if (typeof seconds !== 'number' || typeof duration !== 'number') return;
      if (!completedFiredRef.current && shouldMarkVideoComplete(seconds, duration)) {
        completedFiredRef.current = true;
        onCompletedRef.current?.();
      }
    };

    const onEndedHandler = () => {
      if (!completedFiredRef.current) {
        completedFiredRef.current = true;
        onCompletedRef.current?.();
      }
      openOverlayRef.current();
    };

    const onReadyHandler = async () => {
      const prefs = getVideoPlaybackPrefs();
      player.setVolume?.(Math.round(prefs.volume * 100));
      player.setPlaybackRate?.(prefs.playbackRate);
      if (shouldAutoPlay) {
        try {
          await player.play?.();
        } catch {
          try {
            await player.mute?.();
            await player.play?.();
          } catch {
            /* browser blocked autoplay */
          }
        }
      }
      onAutoPlayConsumedRef.current?.();
    };

    const onVolumeChangeHandler = async () => {
      try {
        const volume = await player.getVolume?.();
        if (typeof volume === 'number') {
          saveVideoPlaybackPrefs({ volume: volume / 100 });
        }
      } catch {
        /* ignore */
      }
    };

    const onPlaybackRateChangeHandler = async () => {
      try {
        const rate = await player.getPlaybackRate?.();
        if (typeof rate === 'number') {
          saveVideoPlaybackPrefs({ playbackRate: rate });
        }
      } catch {
        /* ignore */
      }
    };

    player.on('ready', onReadyHandler);
    player.on('play', onPlayHandler);
    player.on('timeupdate', onTimeupdateHandler);
    player.on('ended', onEndedHandler);
    player.on('volumeChange', onVolumeChangeHandler);
    player.on('playbackRateChange', onPlaybackRateChangeHandler);

    return () => {
      player.off('ready', onReadyHandler);
      player.off('play', onPlayHandler);
      player.off('timeupdate', onTimeupdateHandler);
      player.off('ended', onEndedHandler);
      player.off('volumeChange', onVolumeChangeHandler);
      player.off('playbackRateChange', onPlaybackRateChangeHandler);
      container.innerHTML = '';
    };
  }, [assetId, title]);

  if (!assetId) return null;

  return (
    <InspectShield className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
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
