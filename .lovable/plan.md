## Deploy the new OG image to Live

### Current state (verified)
- `public/og_image_3.png` (83 KB) exists in the repo; `public/og-image.png` and `og_img_2.png` have been deleted.
- `index.html` in the repo points `og:image`, `og:image:alt`, and `twitter:image` at `https://learn.approachable.dev/og_image_3.png`.
- The Live site still serves the old markup: `og:image` = `https://learn.approachable.dev/og-image.png`.
- `https://learn.approachable.dev/og_image_3.png` returns **404** — the asset has not been deployed.

Conclusion: the OG image change is on Test only. Nothing is broken in the code; it just needs a frontend publish.

### Steps
1. Run a security scan check — publishing is blocked by unresolved critical findings. The previous critical blocker was cleared, so this should pass; only warn-level findings remain.
2. Publish to Live. This deploys the built frontend plus everything in `public/` (`og_image_3.png`, favicons, `robots.txt`, `sitemap.xml`, Apple Pay domain association).
3. Verify after the deploy: confirm `https://learn.approachable.dev/og_image_3.png` returns 200 and that the live HTML head shows the new `og:image`.

### Notes
- Live currently references `og-image.png`, which no longer exists in the repo — after publish that path will 404, so any external link still pointing at it will break. The new tags don't use it, so this only matters for previously cached shares.
- LinkedIn/X/Facebook cache link previews; they'll keep showing the old image until re-scraped. Each platform's link preview debugger can force a refresh after the deploy.
- Deploy takes about a minute; the custom domain can take slightly longer.
