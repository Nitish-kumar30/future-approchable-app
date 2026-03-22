

## Update Prompting Guide Data to Match Source Document

### Problem
1. The current `promptingGuide.ts` uses invented examples instead of the exact ones from the uploaded MD file
2. The `GuideStep` interface is missing an `additionalTips` field that exists in the source (e.g., "Be clear and specific" has tips like "Clearly state your task or question at the beginning")

### Changes

**1. `src/data/promptingGuide.ts`** — Full rewrite of content:
- Add `additionalTips: string[]` to the `GuideStep` interface
- Replace all bad/good prompts, explanations, and "why it's better" text with the exact content from the MD file:
  - **General Tips**: 6 steps with exact examples (presentation help, professional email, team productivity, tone refinement, eco-friendly marketing, fabric supplier negotiation)
  - **Content Creation**: 3 steps (cybersecurity blog, ergonomic chair description, Q2 presentation)
  - **Document Summary & Q&A**: 1 step (Tech Industry Trends report) with additional tips about using document names, asking for citations, specifying summary type
  - **Data Analysis**: 1 step (Sales Data 2023 spreadsheet) with additional tips about specifying format
  - **Brainstorming**: 2 steps (remote team activities, project management comparison table)
  - **Troubleshooting**: 3 tips (acknowledge uncertainty, break down tasks, include context) — these are short advisory tips from the MD
  - **Full Examples**: 2 comprehensive examples (eco-friendly smartphone accessories marketing strategy, Q2 financial report CFO analysis) — exact text from MD

**2. `src/components/prompts/PromptFlipCard.tsx`** — Add display for additional tips:
- Accept optional `additionalTips: string[]` prop
- Render as a small bullet list below the step explanation (before the flip card area)

**3. `src/components/prompts/PromptingGuideModal.tsx`** — Pass `additionalTips` through to the UI:
- Display tips below the explanation text, styled as a subtle callout or bullet list

### No database changes needed — all static content.

