

## Plan: Create Public `/registration` Page

### 1. New file: `src/pages/Registration.tsx`
- Public page using `PublicHeader` + `Footer`
- Form fields matching the screenshot:
  - Name, Email, WhatsApp number (required)
  - Cohort dropdown -- **hardcoded options** (e.g. "AI Fundamentals Cohort 1", "Vibe Coding Cohort 2")
  - "What do you want to learn?" checkbox group (AI Fundamentals, Vibe Coding, No-code AI Agents, Prompt Engineering, Other)
  - Company name, Role (required)
  - "Why do you want to join?" (textarea, required)
  - "Anything else?" (textarea, optional)
  - Commitment fee acknowledgment (checkbox, required)
- On submit: success toast, no DB writes

### 2. Update `src/App.tsx`
- Add route: `/registration` → `Registration`

