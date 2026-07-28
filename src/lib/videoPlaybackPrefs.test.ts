import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_VIDEO_PLAYBACK_PREFS,
  getVideoPlaybackPrefs,
  saveVideoPlaybackPrefs,
} from "./videoPlaybackPrefs";

const STORAGE_KEY = "approachable:video-playback-prefs";

describe("videoPlaybackPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(getVideoPlaybackPrefs()).toEqual(DEFAULT_VIDEO_PLAYBACK_PREFS);
  });

  it("saves and reads volume and playback rate", () => {
    saveVideoPlaybackPrefs({ volume: 0.7, playbackRate: 1.25 });
    expect(getVideoPlaybackPrefs()).toEqual({ volume: 0.7, playbackRate: 1.25 });
  });

  it("merges partial updates", () => {
    saveVideoPlaybackPrefs({ volume: 0.5 });
    saveVideoPlaybackPrefs({ playbackRate: 1.5 });
    expect(getVideoPlaybackPrefs()).toEqual({ volume: 0.5, playbackRate: 1.5 });
  });

  it("clamps volume to 0-1", () => {
    saveVideoPlaybackPrefs({ volume: 2 });
    expect(getVideoPlaybackPrefs().volume).toBe(1);
    saveVideoPlaybackPrefs({ volume: -1 });
    expect(getVideoPlaybackPrefs().volume).toBe(0);
  });

  it("clamps playback rate to 0.25-2", () => {
    saveVideoPlaybackPrefs({ playbackRate: 4 });
    expect(getVideoPlaybackPrefs().playbackRate).toBe(2);
    saveVideoPlaybackPrefs({ playbackRate: 0.1 });
    expect(getVideoPlaybackPrefs().playbackRate).toBe(0.25);
  });

  it("falls back to defaults for corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");
    expect(getVideoPlaybackPrefs()).toEqual(DEFAULT_VIDEO_PLAYBACK_PREFS);
  });
});
