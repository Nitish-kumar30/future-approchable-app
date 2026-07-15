import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onNearEnd?: () => void;
  className?: string;
}

/**
 * HLS video player. Uses hls.js on browsers without native HLS,
 * and native playback on Safari / iOS.
 */
export default function HlsPlayer({
  src,
  poster,
  autoPlay = false,
  onProgress,
  onEnded,
  onNearEnd,
  className,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nearEndFiredRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    nearEndFiredRef.current = false;
    let hls: Hls | null = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

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
      className={className ?? 'w-full h-full bg-black rounded-lg'}
    />
  );
}
