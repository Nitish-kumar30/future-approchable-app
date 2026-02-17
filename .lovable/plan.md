

# Render Session Descriptions as Markdown

## Problem
Session descriptions contain structured text with dashes (`-`) intended as bullet points and line breaks, but they are rendered as plain text inside `CardDescription`, collapsing everything into one long line.

## Solution
Replace the plain `CardDescription` rendering of session descriptions with the existing `Markdown` component (which uses `react-markdown` with `remark-gfm` and preserves line breaks). This will properly render bullet points, headings, and other formatting.

## Changes

### `src/pages/CohortDetail.tsx`
- Import the `Markdown` component from `@/components/ui/markdown`
- Replace `<CardDescription>{session.description}</CardDescription>` with `<Markdown content={session.description} className="text-sm" />`

This is a one-line swap using an already-existing component -- no new dependencies or components needed.
