

## Overhaul: Two-Column Prompting Guide Layout

### Current State
The PromptFlipCard renders everything in a single vertical stack: bad prompt, tips, user attempt textarea, reveal button, then (after reveal) good prompt, your version, why it's better. Navigation (Back/Cancel/Next) lives outside in the modal. This wastes vertical space and requires scrolling.

### New Layout

**Desktop (md+): Side-by-side two columns**
- **Left column** (sticky top): Bad Prompt card + Tips
- **Right column** (scrollable): Step title/explanation, "Your Attempt" textarea + "Reveal Suggested Answer" button. After reveal: Your Version, Good Prompt, Why It's Better
- Navigation bar (Back / Cancel / Next) fixed at the bottom of the modal

**Mobile (<md): Stacked single column**
- Same content order: Bad Prompt + Tips on top, then Your Attempt section below
- Navigation still pinned at bottom

### File Changes

**1. `src/components/prompts/PromptFlipCard.tsx` — Major rewrite**
- Remove the 3D flip animation (unnecessary complexity, wastes space)
- Accept `onBack`, `onNext`, `onCancel`, `backDisabled`, `nextDisabled` props so navigation lives inside the component
- New structure:
  - Outer container: `grid grid-cols-1 md:grid-cols-2 gap-4` with `flex flex-col h-full`
  - Left column: Bad Prompt card + Tips (on desktop, sticky; on mobile, just stacked)
  - Right column: Title/explanation at top, textarea + reveal button. After reveal: scrollable area showing Your Version (if typed), Good Prompt with copy button, Why It's Better
  - Bottom navigation bar: flex row with Back, Cancel, Next — always visible, pinned via `mt-auto`

**2. `src/components/prompts/PromptingGuideModal.tsx` — Simplify**
- Move step title/explanation into PromptFlipCard (or keep above the grid, either works — keeping it above the grid is cleaner)
- Pass navigation callbacks and disabled states to PromptFlipCard
- Remove the separate navigation section since it's now inside the card
- Make the modal content use `flex flex-col h-full` so the nav bar pins to the bottom
- Progress bar stays at top, outside the two-column area

### Layout Sketch

```text
┌─────────────────────────────────────────────┐
│ Prompting Guide                          [X]│
│ [Tab1] [Tab2] [Tab3] ...                    │
│ Step 2 of 5              [Category Badge]   │
│ ████████░░░░░░░░░░░░░░░░░░ (progress bar)   │
│ Step Title                                  │
│ Step explanation text...                    │
├──────────────────┬──────────────────────────┤
│ ❌ Bad Prompt    │ ✨ Your Attempt          │
│ "Write something │ ┌──────────────────────┐ │
│  about cyber..." │ │ Textarea...          │ │
│                  │ └──────────────────────┘ │
│ 💡 Tips          │ [Reveal Suggested Answer]│
│ • Tip 1          │                          │
│ • Tip 2          │ (after reveal:)          │
│ • Tip 3          │ 📝 Your Version         │
│                  │ "user typed text..."     │
│                  │ ✅ Good Prompt     [Copy]│
│                  │ "detailed prompt..."     │
│                  │ 💡 Why It's Better       │
│                  │ "explanation..."         │
├──────────────────┴──────────────────────────┤
│ [< Back]              [Cancel]   [Next >]   │
└─────────────────────────────────────────────┘
```

On mobile, the two columns stack vertically (left on top, right below), and the bottom nav stays pinned.

### Key Decisions
- Drop the 3D flip animation — it adds complexity and hides content. A simple reveal (show/hide) is cleaner and more space-efficient
- Navigation moves inside the component to form a cohesive unit
- Right column becomes scrollable after reveal so everything fits without the modal itself needing to scroll excessively
- The modal remains full-screen as it is today

