type PlayerJsHandler = (data?: unknown) => void;

export type PlayerJsInstance = {
  on: (event: string, cb: PlayerJsHandler) => void;
  play: () => void;
  setVolume?: (volume: number) => void;
  setPlaybackRate?: (rate: number) => void;
  destroy: () => void;
};

const CONTEXT = 'player.js';
const VERSION = '0.0.11';

function parseMessage(raw: unknown): Record<string, unknown> | null {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  if (rec.context !== CONTEXT) return null;
  return rec;
}

export function attachPlayerJs(iframe: HTMLIFrameElement): PlayerJsInstance {
  const origin = new URL(iframe.src).origin;
  const handlers = new Map<string, Set<PlayerJsHandler>>();
  let ready = false;
  const pending: Array<() => void> = [];

  const send = (method: string, value?: unknown, listener?: string) => {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ context: CONTEXT, version: VERSION, method, value, listener }),
      origin,
    );
  };

  const markReady = () => {
    if (ready) return;
    ready = true;
    pending.splice(0).forEach((fn) => fn());
    handlers.get('ready')?.forEach((fn) => fn());
  };

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;
    const data = parseMessage(event.data);
    if (!data) return;
    const eventName = typeof data.event === 'string' ? data.event : null;
    if (!eventName) return;
    if (eventName === 'ready') {
      markReady();
      return;
    }
    handlers.get(eventName)?.forEach((fn) => fn(data.value));
  };

  window.addEventListener('message', onMessage);
  iframe.addEventListener('load', () => {
    window.setTimeout(markReady, 300);
  });

  return {
    on(event, cb) {
      const set = handlers.get(event) ?? new Set();
      set.add(cb);
      handlers.set(event, set);
      if (event === 'ready') {
        if (ready) cb();
        return;
      }
      const subscribe = () => send('addEventListener', event, event);
      if (ready) subscribe();
      else pending.push(subscribe);
    },
    play() {
      send('play');
    },
    setVolume(volume) {
      send('setVolume', volume);
    },
    setPlaybackRate(rate) {
      send('setPlaybackRate', rate);
    },
    destroy() {
      window.removeEventListener('message', onMessage);
      handlers.clear();
    },
  };
}

export function timeupdateSeconds(data: unknown): { seconds: number; duration: number } | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as { seconds?: unknown; duration?: unknown };
  const seconds = typeof rec.seconds === 'number' ? rec.seconds : null;
  const duration = typeof rec.duration === 'number' ? rec.duration : null;
  if (seconds == null || duration == null) return null;
  return { seconds, duration };
}
