

## Update Registration URL in Constants

Change `COHORT_FORM_URL` from the Google Forms link to the app's own `/registration` page, using the production URL when in production.

### Changes

**`src/lib/constants.ts`**
- Replace the Google Forms URL with a check: if `window.location.hostname` includes `approachable` (production), use `https://learn.approachable.dev/registration`, otherwise use `/registration` (relative, for dev/preview).

