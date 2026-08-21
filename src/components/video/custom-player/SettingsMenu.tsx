import { useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLAYBACK_SPEEDS } from './playbackSpeeds';
import type { QualityLevel } from './useHlsEngine';

type Pane = 'main' | 'quality' | 'speed';

interface SettingsMenuProps {
  open: boolean;
  levels: QualityLevel[];
  autoLevelActive: boolean;
  activeLevelLabel: string;
  currentLevelIndex: number;
  onSelectQuality: (index: number) => void;
  playbackRate: number;
  onSelectSpeed: (rate: number) => void;
  isNativeHls: boolean;
}

function Row({
  label,
  selected,
  onClick,
  trailing,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:bg-white/10"
    >
      <Check className={cn('h-3 w-3 shrink-0 text-primary', selected ? 'opacity-100' : 'opacity-0')} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </div>
  );
}

function PaneHead({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div
      onClick={onBack}
      className="mb-0.5 flex cursor-pointer items-center gap-1 border-b border-white/10 px-1.5 py-1 text-[12px] font-semibold tracking-wide"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

export default function SettingsMenu({
  open,
  levels,
  autoLevelActive,
  activeLevelLabel,
  currentLevelIndex,
  onSelectQuality,
  playbackRate,
  onSelectSpeed,
  isNativeHls,
}: SettingsMenuProps) {
  const [pane, setPane] = useState<Pane>('main');

  const qualityValue = !levels.length
    ? 'Auto'
    : autoLevelActive
      ? activeLevelLabel
        ? `Auto · ${activeLevelLabel}`
        : 'Auto'
      : (() => {
          const level = levels.find((l) => l.index === currentLevelIndex);
          return level?.height ? `${level.height}p` : 'Auto';
        })();

  const speedValue = playbackRate === 1 ? 'Normal' : `${playbackRate}×`;

  return (
    <div
      role="menu"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute bottom-[48px] right-2 z-40 w-[min(200px,calc(100%-1rem))] max-h-[min(11rem,calc(100%-3.5rem))] origin-bottom-right overflow-y-auto rounded-[10px] border border-white/10 bg-[rgba(18,18,22,0.92)] p-1 text-white shadow-2xl backdrop-blur-2xl transition-all duration-150 ease-out sm:right-3 sm:bottom-[52px]',
        open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0 translate-y-2',
      )}
      onTransitionEnd={() => {
        if (!open) setPane('main');
      }}
    >
      {pane === 'main' && (
        <div className="animate-fade-in">
          <Row
            label="Quality"
            selected={false}
            onClick={() => setPane('quality')}
            trailing={
              <span className="flex min-w-0 max-w-[7rem] items-center gap-0.5 text-[11px] text-white/55">
                <span className="truncate">{qualityValue}</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </span>
            }
          />
          <Row
            label="Playback speed"
            selected={false}
            onClick={() => setPane('speed')}
            trailing={
              <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-white/55">
                {speedValue}
                <ChevronRight className="h-3 w-3" />
              </span>
            }
          />
        </div>
      )}

      {pane === 'quality' && (
        <div className="animate-fade-in">
          <PaneHead label="Quality" onBack={() => setPane('main')} />
          <div>
            {!levels.length ? (
              <Row label="Auto" selected trailing={<span className="shrink-0 text-[11px] text-white/55">{isNativeHls ? 'native' : 'adaptive'}</span>} onClick={() => {}} />
            ) : (
              <>
                <Row label="Auto" selected={autoLevelActive} onClick={() => onSelectQuality(-1)} />
                {levels.map((level) => (
                  <Row
                    key={level.index}
                    label={level.height ? `${level.height}p` : `Level ${level.index}`}
                    selected={!autoLevelActive && currentLevelIndex === level.index}
                    onClick={() => onSelectQuality(level.index)}
                    trailing={
                      level.height >= 1080 ? (
                        <span className="shrink-0 rounded border border-white/35 px-1 py-px text-[8px] font-bold tracking-wider text-white/80">
                          HD
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {pane === 'speed' && (
        <div className="animate-fade-in">
          <PaneHead label="Playback speed" onBack={() => setPane('main')} />
          <div>
            {PLAYBACK_SPEEDS.map((speed) => (
              <Row
                key={speed}
                label={speed === 1 ? 'Normal' : `${speed}×`}
                selected={Math.abs(playbackRate - speed) < 0.01}
                onClick={() => onSelectSpeed(speed)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
