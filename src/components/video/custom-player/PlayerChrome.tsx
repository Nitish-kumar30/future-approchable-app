import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPlayerTime } from './playerTime';
import type { PlayerUiActions, PlayerUiState } from './types';

interface PlayerChromeProps {
  state: PlayerUiState;
  actions: PlayerUiActions;
  visible: boolean;
}

export default function PlayerChrome({ state, actions, visible }: PlayerChromeProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [scrubPercent, setScrubPercent] = useState<number | null>(null);

  const volTrackRef = useRef<HTMLDivElement>(null);
  const [volDragging, setVolDragging] = useState(false);
  const [volHover, setVolHover] = useState(false);

  const duration = state.duration || 0;
  const playedPercent = dragging && scrubPercent !== null ? scrubPercent : duration ? state.currentTime / duration : 0;
  const bufferedPercent = duration ? state.bufferedEnd / duration : 0;

  const percentFromClientX = (clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const handleProgressPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setDragging(true);
    progressRef.current?.setPointerCapture(e.pointerId);
    const p = percentFromClientX(e.clientX);
    setScrubPercent(p);
    actions.seekTo(p * duration);
  };
  const handleProgressPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    setScrubPercent(percentFromClientX(e.clientX));
  };
  const handleProgressPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    const p = percentFromClientX(e.clientX);
    actions.seekTo(p * duration);
  };
  const handleProgressPointerLeave = () => {
    if (!dragging) setScrubPercent(null);
  };

  const volumePercentFromClientX = (clientX: number) => {
    const rect = volTrackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const handleVolPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setVolDragging(true);
    volTrackRef.current?.setPointerCapture(e.pointerId);
    actions.setVolume(volumePercentFromClientX(e.clientX));
  };
  const handleVolPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (volDragging) actions.setVolume(volumePercentFromClientX(e.clientX));
  };
  const handleVolPointerUp = () => setVolDragging(false);

  const displayVolume = state.muted ? 0 : state.volume;
  const VolumeIcon = displayVolume === 0 ? VolumeX : displayVolume < 0.5 ? Volume1 : Volume2;
  const scrubTime = (scrubPercent ?? 0) * duration;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-2 pb-2 pt-9 transition-all duration-300 ease-out sm:px-3.5 sm:pb-3 sm:pt-11',
        'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0',
      )}
    >
      {/* progress rail */}
      <div
        ref={progressRef}
        className={cn(
          'group relative mb-0.5 flex h-4 touch-none cursor-pointer items-center',
          visible && 'pointer-events-auto',
        )}
        onPointerDown={handleProgressPointerDown}
        onPointerMove={handleProgressPointerMove}
        onPointerUp={handleProgressPointerUp}
        onPointerLeave={handleProgressPointerLeave}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-white/25 transition-all duration-150',
            dragging ? 'h-[5px]' : 'h-[3px] group-hover:h-[5px]',
          )}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/35"
            style={{ width: `${bufferedPercent * 100}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${playedPercent * 100}%` }}
          />
        </div>
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary shadow transition-transform duration-150 group-hover:scale-100',
            dragging ? 'scale-100' : 'scale-0',
          )}
          style={{ left: `${playedPercent * 100}%`, transform: 'translate(-50%, -50%)' }}
        />
        {scrubPercent !== null && (
          <div
            className="pointer-events-none absolute bottom-[22px] -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm"
            style={{ left: `${Math.min(96, Math.max(4, scrubPercent * 100))}%` }}
          >
            {formatPlayerTime(scrubTime)}
          </div>
        )}
      </div>

      {/* button row */}
      <div className={cn('flex min-w-0 items-center gap-0.5', visible && 'pointer-events-auto')}>
        <ChromeButton label={state.playing ? 'Pause (k)' : 'Play (k)'} onClick={actions.togglePlay}>
          {state.playing ? <Pause className="h-[19px] w-[19px] fill-current" /> : <Play className="h-[19px] w-[19px] fill-current" />}
        </ChromeButton>

        <ChromeButton label="Back 10s" onClick={() => actions.skip(-10)}>
          <RotateCcw className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
        </ChromeButton>

        <ChromeButton label="Forward 10s" onClick={() => actions.skip(10)}>
          <RotateCw className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
        </ChromeButton>

        <div
          className="flex items-center"
          onPointerEnter={() => setVolHover(true)}
          onPointerLeave={() => setVolHover(false)}
        >
          <ChromeButton label="Mute (m)" onClick={actions.toggleMute}>
            <VolumeIcon className="h-[19px] w-[19px]" />
          </ChromeButton>
          <div
            className={cn(
              'overflow-hidden transition-all duration-200 ease-out',
              volHover || volDragging ? 'ml-1.5 w-16' : 'w-0',
            )}
          >
            <div
              ref={volTrackRef}
              className="relative ml-1 h-[3px] w-16 touch-none cursor-pointer rounded-full bg-white/28"
              onPointerDown={handleVolPointerDown}
              onPointerMove={handleVolPointerMove}
              onPointerUp={handleVolPointerUp}
            >
              <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${displayVolume * 100}%` }} />
              <div
                className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow"
                style={{ left: `${displayVolume * 100}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 truncate whitespace-nowrap px-1 text-[11px] font-medium tabular-nums text-white/90 sm:px-2.5 sm:text-[12.5px]">
          {formatPlayerTime(state.currentTime)}
          <span className="mx-0.5 text-white/45">/</span>
          {formatPlayerTime(state.duration)}
        </div>

        <div className="min-w-0 flex-1" />

        <ChromeButton label="Settings" onClick={actions.toggleSettings} active={state.settingsOpen} markerAttr="data-settings-trigger">
          <Settings className="h-[19px] w-[19px]" />
        </ChromeButton>

        {state.pipSupported && (
          <ChromeButton className="hidden sm:flex" label="Picture in picture" onClick={actions.togglePip}>
            <PictureInPicture2 className="h-[19px] w-[19px]" />
          </ChromeButton>
        )}

        <ChromeButton
          className="shrink-0"
          label={state.isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
          onClick={actions.toggleFullscreen}
        >
          {state.isFullscreen ? <Minimize className="h-[19px] w-[19px]" /> : <Maximize className="h-[19px] w-[19px]" />}
        </ChromeButton>
      </div>
    </div>
  );
}

function ChromeButton({
  label,
  onClick,
  children,
  active,
  disabled,
  markerAttr,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  markerAttr?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...(markerAttr ? { [markerAttr]: true } : {})}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      className={cn(
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-colors sm:h-9 sm:w-9',
        disabled ? 'opacity-40' : 'hover:bg-white/15 active:scale-[0.94]',
        className,
      )}
    >
      {children}
      {active && <span className="absolute bottom-[5px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />}
    </button>
  );
}
