import { useEffect, useRef, type MutableRefObject } from 'react';
import Hls from 'hls.js';
import { applyVideoPlaybackPrefs, saveVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';

interface HlsPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onPlay?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onNearEnd?: () => void;
  onError?: (msg: string) => void;
  className?: string;
  /** Exposes the underlying <video> element to the parent (e.g. for iOS-native fullscreen). */
  videoRef?: MutableRefObject<HTMLVideoElement | null>;
}

/**
 * HLS video player. Prefers hls.js everywhere it's supported; falls back to
 * native HLS on Safari/iOS. Setup effect depends only on `src` — parent
 * callbacks and autoPlay are stored in refs so re-renders don't tear down the media.
 */
export default function HlsPlayer({
  src,
  poster,
  autoPlay = true,
  showControls = true,
  onPlay,
  onProgress,
  onEnded,
  onNearEnd,
  onError,
  className,
  videoRef: externalVideoRef,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (externalVideoRef) externalVideoRef.current = el;
  };
  const nearEndFiredRef = useRef(false);

  // Keep latest callbacks in refs so the setup effect doesn't re-run on every render.
  const onPlayRef = useRef(onPlay);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onNearEndRef = useRef(onNearEnd);
  const onErrorRef = useRef(onError);
  const autoPlayRef = useRef(autoPlay);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onNearEndRef.current = onNearEnd; }, [onNearEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onVolumeChange = () => {
      saveVideoPlaybackPrefs({ volume: video.volume });
    };
    const onRateChange = () => {
      saveVideoPlaybackPrefs({ playbackRate: video.playbackRate });
    };

    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);

    return () => {
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ratechange', onRateChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    nearEndFiredRef.current = false;
    let hls: Hls | null = null;
    let cancelled = false;

    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch {
      /* noop */
    }

    const tryPlay = () => {
      if (cancelled) return;
      applyVideoPlaybackPrefs(video);
      if (!autoPlayRef.current) return;
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay likely blocked — retry muted.
          try {
            video.muted = true;
            video.play().catch(() => { /* give up silently */ });
          } catch { /* noop */ }
        });
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        // eslint-disable-next-line no-console
        console.error('[HlsPlayer] fatal error', data);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          onErrorRef.current?.(data.details || 'Video error');
          hls?.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        applyVideoPlaybackPrefs(video);
        tryPlay();
      }, { once: true });
    } else {
      onErrorRef.current?.('HLS not supported in this browser');
    }

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [src]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;
    onProgressRef.current?.(v.currentTime, v.duration);
    if (!nearEndFiredRef.current && v.currentTime / v.duration >= 0.95) {
      nearEndFiredRef.current = true;
      onNearEndRef.current?.();
    }
  };

  return (
    <video
      ref={setVideoRef}
      controls={showControls}
      controlsList="nofullscreen"
      disablePictureInPicture
      playsInline
      poster={poster}
      onPlay={() => onPlayRef.current?.()}
      onTimeUpdate={handleTimeUpdate}
      onEnded={() => onEndedRef.current?.()}
      className={className ?? 'w-full h-full bg-black'}
    />
  );
}
