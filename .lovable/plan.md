

## Interactive Prompting Guide — Revised Plan (Modal + Gamified)

### Overview
Add a "Prompting Guide" button next to "Add Prompt" in the Prompt Library header. It opens a large modal with tabbed categories and a step-by-step wizard. Each step includes a **gamified "Improve This Prompt" challenge** where users type their own improved version of a bad prompt, then flip to reveal the suggested good prompt.

### Gamification: "Improve This Prompt" Challenge
Each wizard step shows:
1. The **bad prompt** prominently
2. A text area: "How would you improve this prompt?"
3. A **"Reveal Answer"** button that triggers a flip-card animation, showing the good prompt on the back
4. After reveal, a **"Why it's better"** explanation appears below
5. Users can compare their attempt side-by-side with the suggested good prompt

This encourages active learning — users think before seeing the answer.

### Content Categories (from guide)
1. **General Tips** — 6 steps (Be Clear, Use Examples, Encourage Thinking, Iterative Refinement, Leverage Knowledge, Role-Playing)
2. **Content Creation** — 3 steps (Specify Audience, Define Tone, Define Structure)
3. **Research & Analysis** — 3 steps (Document Summary, Data Analysis, Specify Format)
4. **Brainstorming** — 2 steps (Generate Ideas, Structured Formats)
5. **Troubleshooting** — 3 tips (Acknowledge Uncertainty, Break Down Tasks, Include Context)
6. **Full Examples** — 2 comprehensive examples (Marketing Strategy, Financial Report)

### Files to Create

1. **`src/data/promptingGuide.ts`** — Static typed data: categories → steps → `{ title, explanation, badPrompt, goodPrompt, whyBetter }`

2. **`src/components/prompts/PromptFlipCard.tsx`** — Flip card component:
   - Front: bad prompt displayed + textarea for user's attempt
   - "Reveal Answer" button triggers CSS 3D flip animation
   - Back: good prompt with green styling
   - After flip, user's attempt shown alongside for comparison

3. **`src/components/prompts/PromptingGuideModal.tsx`** — Modal (`Dialog` at `sm:max-w-4xl`):
   - Category tabs across top (using `Tabs`)
   - Within each tab: wizard with `Progress` bar, step title, explanation text
   - `PromptFlipCard` for the bad/good comparison
   - "Why it's better" collapsible section (appears after reveal)
   - Next/Back navigation buttons
   - Step counter (e.g. "Step 2 of 6")

4. **`src/pages/PromptLibrary.tsx`** — Add "Prompting Guide" button with `BookOpen` icon next to "Add Prompt". Boolean state to control modal open/close.

### Technical Details
- Flip animation via CSS `transform: rotateY(180deg)` with `perspective` and `backface-visibility: hidden`
- All content is static TypeScript (no DB migration)
- Uses existing components: `Dialog`, `Tabs`, `Progress`, `Card`, `Button`, `Textarea`, `Badge`
- Responsive: flip card stacks vertically on mobile

