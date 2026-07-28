const STORAGE_KEY = "approachable:video-playback-prefs";

const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 2;

export type VideoPlaybackPrefs = {
  volume: number;
  playbackRate: number;
};

export const DEFAULT_VIDEO_PLAYBACK_PREFS: VideoPlaybackPrefs = {
  volume: 1,
  playbackRate: 1,
};

function clampVolume(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_VIDEO_PLAYBACK_PREFS.volume;
  return Math.min(1, Math.max(0, value));
}

function clampPlaybackRate(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_VIDEO_PLAYBACK_PREFS.playbackRate;
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, value));
}

function normalizePrefs(raw: Partial<VideoPlaybackPrefs> | null | undefined): VideoPlaybackPrefs {
  return {
    volume: clampVolume(raw?.volume),
    playbackRate: clampPlaybackRate(raw?.playbackRate),
  };
}

export function getVideoPlaybackPrefs(): VideoPlaybackPrefs {
  if (typeof window === "undefined") return DEFAULT_VIDEO_PLAYBACK_PREFS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_VIDEO_PLAYBACK_PREFS;
    return normalizePrefs(JSON.parse(stored) as Partial<VideoPlaybackPrefs>);
  } catch {
    return DEFAULT_VIDEO_PLAYBACK_PREFS;
  }
}

export function saveVideoPlaybackPrefs(partial: Partial<VideoPlaybackPrefs>): void {
  if (typeof window === "undefined") return;

  const next = normalizePrefs({
    ...getVideoPlaybackPrefs(),
    ...partial,
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode errors */
  }
}

export function applyVideoPlaybackPrefs(video: HTMLVideoElement): void {
  const prefs = getVideoPlaybackPrefs();
  video.volume = prefs.volume;
  video.playbackRate = prefs.playbackRate;
}
