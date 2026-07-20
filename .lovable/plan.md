## Diagnosis

The edge function correctly returns `USD` for your VPN'd IP (JP). The UI still shows INR because the browser is serving a stale value from `sessionStorage`.

In `src/hooks/usePricingCurrency.tsx`:
- On mount, it reads `sessionStorage['pricing-currency']`. If present and not expired, it uses that and **skips** the edge function call.
- TTL is 24 hours, so once INR was cached (before you turned on the VPN), it sticks for the whole browser session / 24h.

Quick manual verification: open DevTools → Application → Session Storage → delete `pricing-currency` → reload. Button will flip to USD.

## Fix

Make the cache VPN/location-change resilient without hammering ip-api on every render.

1. **Shorten TTL + move to a background refresh model** in `src/hooks/usePricingCurrency.tsx`:
   - Serve cached value instantly (stale-while-revalidate) but **always** fire `get-pricing-currency` in the background on mount.
   - If the server response differs from cache, update state + cache.
   - Reduce TTL from 24h to ~1h as a safety net.

2. Keep `sessionStorage` (clears on tab close) — no schema/db changes, no edge function changes.

### Files touched
- `src/hooks/usePricingCurrency.tsx` — only file changed.

### Out of scope
- No edge function changes (it's already correct).
- No new caching layer, no user-facing currency toggle (per product req).

Shall I proceed?
