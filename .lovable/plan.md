

## Add Promotional Banner to All Authenticated Pages

### Change
Add a sticky indigo/purple gradient banner at the top of `MainLayout.tsx`, before the header, with cohort details and a CTA button linking to the provided Google Form.

### File: `src/components/layout/MainLayout.tsx`
- Insert a banner `<div>` as the first child inside the outer container, before `<header>`
- Gradient: `bg-gradient-to-r from-indigo-600 to-purple-600`
- Text: `🔥 Next live cohort with Ranbeer — Apr 23, 2026 · Only 20 seats · ₹2,999 (India) / $99 (International)`
- Button: "Reserve Your Seat →" linking to `https://docs.google.com/forms/d/e/1FAIpQLScKsweqhNvfnHdRpB-8AEK_riK9FI45ziPfSYk8yHXFpaWp-g/viewform?usp=dialog` (opens in new tab)
- Responsive: text wraps on mobile, button below text on small screens
- No dismiss functionality — always visible

No other files affected.

