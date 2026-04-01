

## Mid-Course Upsell as Video Overlay

### What Changes
Instead of showing the `CohortUpsellCard` below the session content, show it as a dismissible overlay on top of the Vimeo video player when the 3rd session loads. The overlay appears before the video plays, and dismisses when the user clicks "Got it" or starts playback.

### How It Works
1. The parent (`OnDemandCourseDetail`) determines if the current session is the 3rd session (by `session_order`) and passes a `showUpsellOverlay` prop to `VimeoPlayer`
2. `VimeoPlayer` renders the `CohortUpsellCard` as an overlay (similar to the existing end-of-video overlay) with a semi-transparent backdrop
3. The overlay auto-dismisses when the user clicks "Dismiss" or when the video starts playing (works with autoplay too — the overlay disappears on the `play` event)
4. Remove the current inline `<CohortUpsellCard>` from below the session content in `OnDemandCourseDetail`

### Files to Change

**`src/components/session/VimeoPlayer.tsx`**
- Add prop `showUpsellOverlay?: boolean`
- Add state `upsellVisible` initialized from prop
- Render `<CohortUpsellCard variant="mid-course" />` as an overlay (reusing the same `absolute inset-0 bg-black/80 backdrop-blur-sm z-10` pattern as the end-of-video overlay)
- Add a "Dismiss" or "×" button on the overlay
- Auto-dismiss on `play` event (already tracked via `playFiredRef`)

**`src/pages/OnDemandCourseDetail.tsx`**
- Compute whether active session is the 3rd session: `const isThirdSession = activeSession?.session_order === 3`
- Pass `showUpsellOverlay={isThirdSession && user}` to `<VimeoPlayer>`
- Remove the current inline `<CohortUpsellCard variant="mid-course" />` below session content

### Behavior
- Overlay appears immediately when session 3 loads (even with autoplay — video plays behind the blurred overlay)
- User dismisses via "Continue Watching" button or clicking ×
- If video starts playing (autoplay), overlay still shows until manually dismissed — ensures the user sees it
- Only shown once per page load for session 3; not re-shown if user navigates away and back (tracked via a ref)

