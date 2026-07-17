## Fix: Course hero image being cropped

**File:** `src/pages/CourseDetail.tsx` (hero image block, ~line 411)

**Change:** Replace the fixed-height container (`h-64 md:h-80` with `object-cover`) with a responsive aspect-ratio container that matches the uploaded artwork proportions, so the full image is visible without cropping the top/bottom.

```tsx
<div className="relative w-full aspect-[5/2] md:aspect-[8/3] rounded-xl overflow-hidden bg-muted">
  <img
    src={course.image_url}
    alt={course.name}
    className="w-full h-full object-cover object-center"
  />
</div>
```

Why this works:
- The AI Mastery banner is ~1600×620 (≈8:3). Using `aspect-[8/3]` on desktop matches it, so `object-cover` no longer trims the top.
- On mobile we use a slightly taller `aspect-[5/2]` so text in the artwork remains readable at narrow widths.
- No other course/session/thumbnail logic is touched — this only affects the hero container on the course detail page.

No DB or edge function changes needed.