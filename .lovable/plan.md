

# Plan: Fix Line Break Rendering in Markdown Component

## Problem
Line breaks and extra spacing in cohort/course descriptions are not rendering correctly. The current preprocessing approach with trailing spaces isn't reliably preserving the formatting as written in the database.

## Solution
Add CSS `whitespace-pre-line` styling to the Markdown component to preserve line breaks while still wrapping text normally. This is a simple, reliable approach that respects the original formatting without complex string manipulation.

## Changes

### 1. Update Markdown Component (`src/components/ui/markdown.tsx`)

**What changes:**
- Add `whitespace-pre-line` class to the wrapper div
- This CSS property:
  - Preserves line breaks (newlines are respected)
  - Collapses multiple spaces into one (normal behavior)
  - Text wraps normally at container edges

**Updated code:**
```tsx
<div
  className={cn(
    'prose prose-sm max-w-none dark:prose-invert',
    'prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2',
    'prose-p:text-foreground prose-p:leading-relaxed prose-p:my-3',
    'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
    'prose-strong:text-foreground prose-strong:font-semibold',
    'prose-ul:text-foreground prose-ul:my-3 prose-ol:text-foreground prose-ol:my-3',
    'prose-li:text-foreground prose-li:my-1',
    'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm',
    'prose-pre:bg-muted prose-pre:border prose-pre:border-border',
    'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
    '[&_p]:whitespace-pre-line',  // Preserve line breaks in paragraphs
    className
  )}
>
```

The `[&_p]:whitespace-pre-line` selector targets all paragraph elements within the Markdown output, ensuring line breaks are preserved while still allowing markdown features (bold, links, lists) to work correctly.

---

## Technical Notes
- `whitespace-pre-line` is the ideal CSS property because it:
  - Preserves newline characters as line breaks
  - Still wraps long lines normally
  - Doesn't break markdown formatting like lists or code blocks
- The content preprocessing logic can remain as a fallback, but the CSS approach is more reliable

