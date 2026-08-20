import type { QualityLevel } from './useHlsEngine';

export interface PlayerUiState {
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  pipSupported: boolean;
  levels: QualityLevel[];
  autoLevelActive: boolean;
  activeLevelLabel: string;
  currentLevelIndex: number;
  isNativeHls: boolean;
  settingsOpen: boolean;
}

export interface PlayerUiActions {
  togglePlay: () => void;
  seekTo: (time: number) => void;
  skip: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setQualityLevel: (index: number) => void;
  toggleFullscreen: () => void;
  togglePip: () => void;
  toggleSettings: () => void;
}
