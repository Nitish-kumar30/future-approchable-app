import { describe, expect, it } from 'vitest';
import { shouldBlockDevToolsKey } from './devToolsKeys';

function keyEvent(partial: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    altKey: false,
    ...partial,
  } as KeyboardEvent;
}

describe('shouldBlockDevToolsKey', () => {
  it('blocks F12', () => {
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'F12' }))).toBe(true);
  });

  it('blocks Ctrl+Shift+I/J/C', () => {
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'I', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'i', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'J', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'C', ctrlKey: true, shiftKey: true }))).toBe(true);
  });

  it('blocks Ctrl+U (view source)', () => {
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'U', ctrlKey: true }))).toBe(true);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'u', ctrlKey: true }))).toBe(true);
  });

  it('blocks Meta+Alt+I/J/C (macOS DevTools)', () => {
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'I', metaKey: true, altKey: true }))).toBe(true);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'j', metaKey: true, altKey: true }))).toBe(true);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'c', metaKey: true, altKey: true }))).toBe(true);
  });

  it('does not block normal typing shortcuts', () => {
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'a', ctrlKey: true }))).toBe(false);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'Enter' }))).toBe(false);
    expect(shouldBlockDevToolsKey(keyEvent({ key: 'I', ctrlKey: true }))).toBe(false);
  });
});
