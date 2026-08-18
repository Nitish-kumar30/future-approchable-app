import { useEffect, useRef } from 'react';
import { getVideoPlaybackPrefs, saveVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { InspectShield } from '@/components/session/InspectShield';
import { useEndOfVideoOverlay } from '@/components/session/useEndOfVideoOverlay';
import type { OnDemandPlayerProps } from '@/components/session/onDemandPlayerTypes';

interface YTPlayer {
  destroy: () => void;
  playVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiLoading: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiLoading) return ytApiLoading;

  ytApiLoading = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return ytApiLoading;
}

export default function YouTubePlayer({
  videoUrl,
  title,
  nextSession,
  onCompleted,
  onNextSession,
  autoPlay,
  onAutoPlayConsumed,
  onPlay,
}: OnDemandPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const { showOverlay, countdown, openOverlay, handleCancel, handleStartNow } = useEndOfVideoOverlay(
    nextSession,
    onNextSession,
  );

  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  const videoId = videoIdMatch?.[1] ?? null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !videoId) return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    completedFiredRef.current = false;
    playFiredRef.current = false;

    const mount = document.createElement('div');
    mount.style.width = '100%';
    mount.style.height = '100%';
    host.appendChild(mount);

    const checkComplete = (player: YTPlayer) => {
      if (completedFiredRef.current) return;
      try {
        const seconds = player.getCurrentTime();
        const duration = player.getDuration();
        if (shouldMarkVideoComplete(seconds, duration)) {
          completedFiredRef.current = true;
          onCompleted();
        }
      } catch {
        /* player not ready */
      }
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mount.isConnected) return;

      const prefs = getVideoPlaybackPrefs();
      const player = new YT.Player(mount, {
        videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            try {
              player.setVolume(Math.round(prefs.volume * 100));
              player.setPlaybackRate(prefs.playbackRate);
            } catch {
              /* ignore */
            }
            if (autoPlay) {
              try {
                player.playVideo();
              } catch {
                /* autoplay may be blocked */
              }
            }
            onAutoPlayConsumed?.();
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === YT.PlayerState.PLAYING) {
              if (!playFiredRef.current) {
                playFiredRef.current = true;
                onPlay?.();
              }
              if (!poll) {
                poll = setInterval(() => checkComplete(player), 500);
              }
            } else if (poll) {
              clearInterval(poll);
              poll = null;
            }
            if (event.data === YT.PlayerState.ENDED) {
              checkComplete(player);
              openOverlay();
            }
          },
          onPlaybackRateChange: (event: { data: number }) => {
            if (typeof event.data === 'number') saveVideoPlaybackPrefs({ playbackRate: event.data });
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
      host.innerHTML = '';
    };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <InspectShield className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
      <div ref={hostRef} className="w-full h-full" title={title} />
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
