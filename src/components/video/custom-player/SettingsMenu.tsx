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
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-white/10"
    >
      <Check className={cn('h-3.5 w-3.5 shrink-0 text-primary', selected ? 'opacity-100' : 'opacity-0')} />
      <span className="flex-1 whitespace-nowrap">{label}</span>
      {trailing}
    </div>
  );
}

function PaneHead({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div
      onClick={onBack}
      className="mb-1 flex cursor-pointer items-center gap-1.5 border-b border-white/10 px-2 py-2 text-[12.5px] font-semibold tracking-wide"
    >
      <ChevronLeft className="h-4 w-4" />
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
        ? `Auto \u00b7 ${activeLevelLabel}`
        : 'Auto'
      : (() => {
          const level = levels.find((l) => l.index === currentLevelIndex);
          return level?.height ? `${level.height}p` : 'Auto';
        })();

  const speedValue = playbackRate === 1 ? 'Normal' : `${playbackRate}\u00d7`;

  return (
    <div
      role="menu"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute bottom-[60px] right-3.5 z-40 w-[210px] origin-bottom-right overflow-hidden rounded-[13px] border border-white/10 bg-[rgba(18,18,22,0.9)] p-1.5 text-white shadow-2xl backdrop-blur-2xl transition-all duration-150 ease-out',
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
              <span className="flex items-center gap-1 text-[12px] text-white/55">
                {qualityValue}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            }
          />
          <Row
            label="Playback speed"
            selected={false}
            onClick={() => setPane('speed')}
            trailing={
              <span className="flex items-center gap-1 text-[12px] text-white/55">
                {speedValue}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            }
          />
        </div>
      )}

      {pane === 'quality' && (
        <div className="animate-fade-in">
          <PaneHead label="Quality" onBack={() => setPane('main')} />
          <div className="max-h-[216px] overflow-y-auto">
            {!levels.length ? (
              <Row label="Auto" selected trailing={<span className="text-[12px] text-white/55">{isNativeHls ? 'native' : 'adaptive'}</span>} onClick={() => {}} />
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
                        <span className="rounded border border-white/35 px-1 py-px text-[8.5px] font-bold tracking-wider text-white/80">
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
          <div className="max-h-[216px] overflow-y-auto">
            {PLAYBACK_SPEEDS.map((speed) => (
              <Row
                key={speed}
                label={speed === 1 ? 'Normal' : `${speed}\u00d7`}
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
