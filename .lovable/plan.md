
## Plan: Floating sticky Pay bar on CourseDetail

A fixed bar at the bottom of the viewport that appears once the user scrolls past the hero banner, shows the course name + price, and includes the existing Pay CTA. Hides again when the user reaches the footer so it doesn't overlap it.

### Behavior
- Visible only on `/courses/:slug` (CourseDetail).
- Only rendered when the course is paid (`isPaidCourse(course)` true) AND the user hasn't already paid/enrolled.
- Appears when the hero banner scrolls out of view (IntersectionObserver on the hero element).
- Hides when the footer enters view (IntersectionObserver on footer sentinel) so it never overlaps the footer.
- On mobile and desktop: same fixed bar, full width, safe-area padding.
- Not shown for admins previewing, if `enrollment_disabled`, or for free courses.

### UI
```
┌──────────────────────────────────────────────────────────────┐
│  AI Mastery for Working Professionals   ₹XX,XXX   [ Pay ▸ ]  │
└──────────────────────────────────────────────────────────────┘
```
- Left: course name (truncated on small screens).
- Middle/right: price label (INR default, USD if only USD is set).
- Right: reuses existing `<PaymentButton>` (small size) → opens Razorpay just like the in-page button.
- Subtle top border + backdrop blur, `z-40` so it sits above content but below dialogs.

### Files
- **New** `src/components/course/StickyPayBar.tsx` — presentational component. Props: `course`, `hasPaid`, `heroRef`, `onPaid`.
- **Edit** `src/pages/CourseDetail.tsx`:
  - Add a `ref` on the existing hero banner `div`.
  - Render `<StickyPayBar …/>` at the bottom of the page (inside `MainLayout`, outside the main content flow).
  - No changes to About / Content / Mentor sections.

### Not touched
- `PaymentButton`, `create-razorpay-order`, `verify-razorpay-payment`, edge functions, DB — none of it changes.

### Tech notes (for reference)
- Visibility toggled with a single `useEffect` + `IntersectionObserver` on the hero ref: bar is `visible` when hero's `intersectionRatio === 0`.
- Add `pb-20 lg:pb-24` on the main container only when bar is visible, so the last content isn't hidden behind the bar.
- Small entry animation: `translate-y-full → translate-y-0` with `transition-transform`.

Ready to implement?
