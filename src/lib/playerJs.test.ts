import { describe, expect, it } from 'vitest';
import { timeupdateSeconds } from './playerJs';

describe('timeupdateSeconds', () => {
  it('reads seconds and duration from player.js payloads', () => {
    expect(timeupdateSeconds({ seconds: 80, duration: 100 })).toEqual({ seconds: 80, duration: 100 });
  });

  it('returns null when duration is missing', () => {
    expect(timeupdateSeconds({ seconds: 10 })).toBeNull();
    expect(timeupdateSeconds(null)).toBeNull();
  });
});
