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
 * native HLS on Safari/iOS. Fully resets media state between src changes so
 * switching chapters works reliably.
 */
export default function HlsPlayer({
  src,
  poster,
  autoPlay = false,
  onProgress,
  onEnded,
  onNearEnd,
  onError,
  className,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nearEndFiredRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    nearEndFiredRef.current = false;
    let hls: Hls | null = null;

    // Reset any previous media state before attaching a new source.
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch {
      /* noop */
    }

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        // eslint-disable-next-line no-console
        console.error('[HlsPlayer] fatal error', data);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          onError?.(data.details || 'Video error');
          hls?.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      onError?.('HLS not supported in this browser');
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, onError]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;
    onProgress?.(v.currentTime, v.duration);
    if (!nearEndFiredRef.current && v.currentTime / v.duration >= 0.95) {
      nearEndFiredRef.current = true;
      onNearEnd?.();
    }
  };

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay={autoPlay}
      poster={poster}
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnded}
      className={className ?? 'w-full h-full bg-black'}
    />
  );
}
