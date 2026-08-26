import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type MutableRefObject,
} from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVideoPlaybackPrefs, saveVideoPlaybackPrefs } from '@/lib/videoPlaybackPrefs';
import { useHlsEngine } from './useHlsEngine';
import PlayerChrome from './PlayerChrome';
import SettingsMenu from './SettingsMenu';
import { PLAYBACK_SPEEDS } from './playbackSpeeds';
import type { PlayerUiActions, PlayerUiState } from './types';

export interface CustomHlsPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  /** When false, keyboard shortcuts and click-to-toggle are suppressed (e.g. while an overlay is shown on top). */
  interactive?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onPlay?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onNearEnd?: () => void;
  onError?: (message: string) => void;
  className?: string;
  /** Exposes the underlying <video> element to the parent (e.g. for iOS-native fullscreen). */
  videoRef?: MutableRefObject<HTMLVideoElement | null>;
}

const IDLE_DELAY_MS = 2600;
const SKIP_SECONDS = 10;

export default function CustomHlsPlayer({
  src,
  poster,
  title,
  autoPlay = true,
  interactive = true,
  isFullscreen = false,
  onToggleFullscreen,
  onPlay,
  onProgress,
  onEnded,
  onNearEnd,
  onError,
  className,
  videoRef: externalVideoRef,
}: CustomHlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (externalVideoRef) externalVideoRef.current = el;
    },
    [externalVideoRef],
  );

  const initialPrefs = useMemo(() => getVideoPlaybackPrefs(), []);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolumeState] = useState(initialPrefs.volume);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(initialPrefs.playbackRate);
  const [idle, setIdle] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rippleLeft, setRippleLeft] = useState(false);
  const [rippleRight, setRippleRight] = useState(false);
  const [pipSupported] = useState(
    () => typeof document !== 'undefined' && !!document.pictureInPictureEnabled,
  );

  const interactiveRef = useRef(interactive);
  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const rippleTimerRef = useRef<{ left?: ReturnType<typeof setTimeout>; right?: ReturnType<typeof setTimeout> }>({});
  const nearEndFiredRef = useRef(false);

  const onPlayRef = useRef(onPlay);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onNearEndRef = useRef(onNearEnd);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  useEffect(() => {
    onNearEndRef.current = onNearEnd;
  }, [onNearEnd]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleEngineError = useCallback((message: string) => {
    onErrorRef.current?.(message);
  }, []);

  const engine = useHlsEngine({ src, videoRef, autoPlay, onError: handleEngineError });

  const flash = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1100);
  }, []);

  const showChrome = useCallback(() => {
    setIdle(false);
  }, []);

  const kickIdle = useCallback(() => {
    showChrome();
    clearTimeout(idleTimerRef.current);
    const video = videoRef.current;
    if (!video || video.paused) return;
    idleTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.paused || settingsOpen) return;
      setIdle(true);
    }, IDLE_DELAY_MS);
  }, [showChrome, settingsOpen]);

  useEffect(() => () => clearTimeout(idleTimerRef.current), []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setPlaying(true);
      setStarted(true);
      video.play().catch(() => setPlaying(false));
    } else {
      setPlaying(false);
      video.pause();
    }
    showChrome();
  }, [showChrome]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || 0;
    video.currentTime = Math.min(dur || Infinity, Math.max(0, time));
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || Infinity;
    video.currentTime = Math.min(dur, Math.max(0, video.currentTime + seconds));

    const side = seconds < 0 ? 'left' : 'right';
    const setter = side === 'left' ? setRippleLeft : setRippleRight;
    clearTimeout(rippleTimerRef.current[side]);
    setter(true);
    rippleTimerRef.current[side] = setTimeout(() => setter(false), 450);
  }, []);

  const setVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    flash(video.muted ? 'Muted' : 'Unmuted');
  }, [flash]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = rate;
      flash(rate === 1 ? 'Normal speed' : `${rate}\u00d7 speed`);
    },
    [flash],
  );

  const bumpSpeed = useCallback(
    (direction: number) => {
      const video = videoRef.current;
      if (!video) return;
      let idx = PLAYBACK_SPEEDS.findIndex((s) => Math.abs(s - video.playbackRate) < 0.01);
      idx = Math.min(PLAYBACK_SPEEDS.length - 1, Math.max(0, (idx < 0 ? 3 : idx) + direction));
      setPlaybackRate(PLAYBACK_SPEEDS[idx]);
    },
    [setPlaybackRate],
  );

  const setQualityLevel = useCallback(
    (index: number) => {
      engine.setQualityLevel(index);
      flash(index === -1 ? 'Auto quality' : 'Quality updated');
    },
    [engine, flash],
  );

  const togglePip = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      flash('Picture-in-picture unavailable');
    }
  }, [flash]);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleOutside = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('[data-settings-menu]') || target?.closest('[data-settings-trigger]')) return;
      setSettingsOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [settingsOpen]);

  const paintProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || 0;
    setCurrentTime(video.currentTime || 0);
    setDuration(dur);
    try {
      if (video.buffered.length) {
        let end = 0;
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
            end = video.buffered.end(i);
          }
        }
        setBufferedEnd(end);
      }
    } catch {
      /* noop */
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    paintProgress();
    const video = videoRef.current;
    if (!video || !video.duration || Number.isNaN(video.duration)) return;
    onProgressRef.current?.(video.currentTime, video.duration);
    if (!nearEndFiredRef.current && video.currentTime / video.duration >= 0.95) {
      nearEndFiredRef.current = true;
      onNearEndRef.current?.();
    }
  }, [paintProgress]);

  useEffect(() => {
    nearEndFiredRef.current = false;
  }, [src]);

  const handleVideoPlay = useCallback(() => {
    setPlaying(true);
    setStarted(true);
    kickIdle();
    onPlayRef.current?.();
  }, [kickIdle]);

  const handleVideoPause = useCallback(() => {
    setPlaying(false);
    showChrome();
  }, [showChrome]);

  const handleVideoEnded = useCallback(() => {
    setPlaying(false);
    setStarted(false);
    showChrome();
    onEndedRef.current?.();
  }, [showChrome]);

  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVolumeState(video.volume);
    setMuted(video.muted);
    saveVideoPlaybackPrefs({ volume: video.volume });
  }, []);

  const handleRateChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackRateState(video.playbackRate);
    saveVideoPlaybackPrefs({ playbackRate: video.playbackRate });
  }, []);

  const handleSurfaceClick = useCallback(() => {
    if (!interactiveRef.current) return;
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    togglePlay();
  }, [settingsOpen, togglePlay]);

  const handleSurfaceDoubleClick = useCallback(
    (side: 'left' | 'right') => {
      if (!interactiveRef.current) return;
      skip(side === 'left' ? -SKIP_SECONDS : SKIP_SECONDS);
    },
    [skip],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!interactiveRef.current) return;
      const key = e.key;
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) e.preventDefault();
      const video = videoRef.current;
      switch (key) {
        case ' ':
        case 'k':
        case 'K':
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          skip(-SKIP_SECONDS);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          skip(SKIP_SECONDS);
          break;
        case 'ArrowUp':
          if (video) {
            video.muted = false;
            video.volume = Math.min(1, video.volume + 0.05);
            flash(`${Math.round(video.volume * 100)}%`);
          }
          break;
        case 'ArrowDown':
          if (video) {
            video.volume = Math.max(0, video.volume - 0.05);
            flash(`${Math.round(video.volume * 100)}%`);
          }
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'f':
        case 'F':
          onToggleFullscreen?.();
          break;
        case '<':
        case ',':
          bumpSpeed(-1);
          break;
        case '>':
        case '.':
          bumpSpeed(1);
          break;
        default:
          if (/^[0-9]$/.test(key) && video?.duration) {
            video.currentTime = video.duration * (Number(key) / 10);
          }
      }
      kickIdle();
    },
    [bumpSpeed, kickIdle, onToggleFullscreen, skip, toggleMute, togglePlay, flash],
  );

  const handlePointerLeaveContainer = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // iOS/Android Safari fire a synthetic "pointerleave" immediately after
    // pointerup for touch pointers (a touch always "leaves" once lifted).
    // Reacting to that here would hide the chrome right after the tap that
    // was meant to reveal it, permanently stranding touch users with no way
    // to bring the controls back. Only real mouse hover-out should hide it.
    if (e.pointerType !== 'mouse') return;
    const video = videoRef.current;
    if (video && !video.paused) setIdle(true);
  }, []);

  const uiState: PlayerUiState = {
    playing,
    buffering,
    currentTime,
    duration,
    bufferedEnd,
    volume,
    muted,
    playbackRate,
    isFullscreen,
    pipSupported,
    levels: engine.levels,
    autoLevelActive: engine.autoLevelActive,
    activeLevelLabel: engine.activeLevelLabel,
    currentLevelIndex: engine.currentLevelIndex,
    isNativeHls: engine.isNativeHls,
    settingsOpen,
  };

  const uiActions: PlayerUiActions = {
    togglePlay,
    seekTo,
    skip,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setQualityLevel,
    toggleFullscreen: () => onToggleFullscreen?.(),
    togglePip,
    toggleSettings,
  };

  const showBigPlay = !started && !buffering;
  const chromeVisible = interactive && !idle;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={kickIdle}
      onPointerDown={kickIdle}
      onPointerLeave={handlePointerLeaveContainer}
      className={cn(
        // touch-pan-y (not touch-none) so iOS Safari still lets the page scroll
        // vertically when a touch starts over the video; touch-none here was
        // blocking all scrolling on iPhone/iPad while the player was on screen.
        'relative touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        idle && 'cursor-none',
        className,
      )}
    >
      <div className={cn('absolute inset-0 overflow-hidden', !isFullscreen && 'rounded-lg')}>
        <video
          ref={setVideoRef}
          playsInline
          poster={poster}
          className="h-full w-full bg-black object-contain [-webkit-touch-callout:none]"
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onEnded={handleVideoEnded}
          onTimeUpdate={handleTimeUpdate}
          onProgress={paintProgress}
          onLoadedMetadata={paintProgress}
          onWaiting={() => setBuffering(true)}
          onSeeking={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onSeeked={() => setBuffering(false)}
          onVolumeChange={handleVolumeChange}
          onRateChange={handleRateChange}
        />
      </div>

      {title && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-[18px] pb-8 pt-4 text-[13.5px] font-medium tracking-tight text-white transition-all duration-300',
            idle ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
          )}
        >
          {title}
        </div>
      )}

      <div
        className="absolute inset-0 z-[1]"
        onClick={handleSurfaceClick}
        onDoubleClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
          handleSurfaceDoubleClick(side);
        }}
      />

      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 flex w-[32%] items-center justify-center gap-1.5 rounded-r-full bg-black/30 text-[12px] font-medium text-white transition-opacity duration-300',
          rippleLeft ? 'opacity-100' : 'opacity-0',
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 19l-9-7 9-7v14zM22 19l-9-7 9-7v14z" />
        </svg>
        {SKIP_SECONDS}s
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 flex w-[32%] items-center justify-center gap-1.5 rounded-l-full bg-black/30 text-[12px] font-medium text-white transition-opacity duration-300',
          rippleRight ? 'opacity-100' : 'opacity-0',
        )}
      >
        {SKIP_SECONDS}s
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 5l9 7-9 7V5zM2 5l9 7-9 7V5z" />
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {showBigPlay && (
          <button
            type="button"
            aria-label="Play"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="pointer-events-auto flex h-[76px] w-[76px] items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur-xl transition-transform duration-200 hover:scale-105 hover:bg-black/60"
          >
            <Play className="ml-1 h-7 w-7 fill-white text-white" />
          </button>
        )}
        {buffering && (
          <div className="h-9 w-9 animate-spin rounded-full border-[2.5px] border-white/20 border-t-white" />
        )}
      </div>

      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-[18px] -translate-x-1/2 rounded-full border border-white/10 bg-black/65 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md">
          {toast}
        </div>
      )}

      <div data-settings-menu className="pointer-events-none">
        <SettingsMenu
          open={settingsOpen}
          levels={engine.levels}
          autoLevelActive={engine.autoLevelActive}
          activeLevelLabel={engine.activeLevelLabel}
          currentLevelIndex={engine.currentLevelIndex}
          onSelectQuality={setQualityLevel}
          playbackRate={playbackRate}
          onSelectSpeed={setPlaybackRate}
          isNativeHls={engine.isNativeHls}
        />
      </div>

      <PlayerChrome state={uiState} actions={uiActions} visible={chromeVisible} />
    </div>
  );
}
