import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import Hls from 'hls.js';
import { applyVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';

export interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
}

interface UseHlsEngineOptions {
  src: string;
  videoRef: RefObject<HTMLVideoElement>;
  autoPlay: boolean;
  onError?: (message: string) => void;
}

export interface HlsEngine {
  levels: QualityLevel[];
  autoLevelActive: boolean;
  /** Human label for the level auto-selection resolved to, e.g. "1080p". Empty when unknown. */
  activeLevelLabel: string;
  currentLevelIndex: number;
  setQualityLevel: (index: number) => void;
  /** True when hls.js isn't supported and playback relies on the browser's native HLS support (Safari/iOS). */
  isNativeHls: boolean;
}

export function useHlsEngine({ src, videoRef, autoPlay, onError }: UseHlsEngineOptions): HlsEngine {
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [autoLevelActive, setAutoLevelActive] = useState(true);
  const [activeLevelLabel, setActiveLevelLabel] = useState('');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(-1);
  const [isNativeHls, setIsNativeHls] = useState(false);

  const hlsRef = useRef<Hls | null>(null);

  const autoPlayRef = useRef(autoPlay);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const setQualityLevel = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setAutoLevelActive(index === -1);
    setCurrentLevelIndex(index);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    let hls: Hls | null = null;

    setLevels([]);
    setAutoLevelActive(true);
    setActiveLevelLabel('');
    setCurrentLevelIndex(-1);

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
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          try {
            video.muted = true;
            video.play().catch(() => {
              /* autoplay blocked even when muted; leave paused */
            });
          } catch {
            /* noop */
          }
        });
      }
    };

    setIsNativeHls(!Hls.isSupported());

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, capLevelToPlayerSize: false, backBufferLength: 60 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        if (cancelled) return;
        const parsed = data.levels
          .map((level, index) => ({ index, height: level.height ?? 0, bitrate: level.bitrate ?? 0 }))
          .filter((level) => level.height !== 360)
          .sort((a, b) => b.height - a.height);
        setLevels(parsed);
        tryPlay();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
        if (cancelled || !hls) return;
        const level = hls.levels[data.level];
        setActiveLevelLabel(level?.height ? `${level.height}p` : '');
        setAutoLevelActive(hls.autoLevelEnabled);
        setCurrentLevelIndex(hls.currentLevel);
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal || !hls) return;
        console.error('[CustomHlsPlayer] fatal hls.js error', data);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          onErrorRef.current?.(data.details || 'Video error');
          hls.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener(
        'loadedmetadata',
        () => {
          tryPlay();
        },
        { once: true },
      );
    } else {
      onErrorRef.current?.('HLS not supported in this browser');
    }

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
      }
      hlsRef.current = null;
    };
  }, [src, videoRef]);

  return {
    levels,
    autoLevelActive,
    activeLevelLabel,
    currentLevelIndex,
    setQualityLevel,
    isNativeHls,
  };
}
