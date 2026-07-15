import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onNearEnd?: () => void;
  onError?: (msg: string) => void;
  className?: string;
}

/**
 * HLS video player. Prefers hls.js everywhere it's supported; falls back to
 * native HLS on Safari/iOS. Setup effect depends only on `src` — parent
 * callbacks are stored in refs so re-renders don't tear down the media.
 */
export default function HlsPlayer({
  src,
  poster,
  autoPlay = true,
  onProgress,
  onEnded,
  onNearEnd,
  onError,
  className,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nearEndFiredRef = useRef(false);

  // Keep latest callbacks in refs so the setup effect doesn't re-run on every render.
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onNearEndRef = useRef(onNearEnd);
  const onErrorRef = useRef(onError);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onNearEndRef.current = onNearEnd; }, [onNearEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

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
      if (cancelled || !autoPlay) return;
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
      video.addEventListener('loadedmetadata', tryPlay, { once: true });
    } else {
      onErrorRef.current?.('HLS not supported in this browser');
    }

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [src, autoPlay]);

  // Promote fullscreen from the <video> to its parent wrapper so overlays
  // (e.g. auto-advance countdown) rendered as siblings remain visible.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onFsChange = () => {
      const fsEl = document.fullscreenElement as Element | null;
      if (fsEl === video) {
        const parent = video.parentElement;
        if (!parent) return;
        document.exitFullscreen().then(() => {
          parent.requestFullscreen?.().catch(() => { /* noop */ });
        }).catch(() => { /* noop */ });
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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
      ref={videoRef}
      controls
      playsInline
      poster={poster}
      onTimeUpdate={handleTimeUpdate}
      onEnded={() => onEndedRef.current?.()}
      className={className ?? 'w-full h-full bg-black'}
    />
  );
}
