## Publish og_img_2.png + current assets to Live

### Current state (verified)
- `public/og_img_2.png` exists in the repo but nothing references it — `index.html` still points `og:image` and `twitter:image` at `https://learn.approachable.dev/og-image.png`.
- Other static assets already in `public/`: `favicon.ico`, `favicon.png`, `og-image.png`, `robots.txt`, `sitemap.xml`, `.well-known/apple-developer-merchantid-domain-association`. These ship with the frontend build; they just need a publish to reach Live.
- Security scan re-checked: no error/critical findings remain (the `cohorts_meeting_link_exposure` blocker is cleared). Six warn-level findings remain and do not block publishing.

### Steps
1. Update `index.html` to point `og:image` and `twitter:image` at `https://learn.approachable.dev/og_img_2.png`.
2. Keep `og-image.png` in the repo as a fallback (no deletion) unless you want it removed.
3. Publish to Live — this deploys the frontend build plus every file in `public/` (new OG image, favicons, robots.txt, sitemap.xml, Apple Pay domain association).

### Notes
- Social platforms cache link previews, so LinkedIn/X/Facebook will keep showing the old image until they re-scrape. You can force a refresh in each platform's link preview debugger after the deploy.
- Publishing also pushes any pending backend migrations/edge-function state to Live; nothing new is pending beyond what was already applied.
- Live deploy takes ~1 minute; the custom domain can take a little longer.
