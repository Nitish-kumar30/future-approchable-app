

# Fix Duplication: Include Pre-Reading Material URLs and Ensure Mini Projects Copy

## The Problem
Two issues with cohort duplication:

1. **Pre-reading material URLs are intentionally cleared** -- Line 299 sets `link: ''` (empty string) instead of copying the original URL. This was part of the original "no data leakage" design, but you want the URLs preserved.

2. **Mini projects may be silently failing** -- The insert call has no error handling, so if the database rejects the insert (e.g., due to a column constraint or RLS policy), the error is swallowed.

## What Will Change

### File: `src/pages/Admin.tsx`

**Pre-reading materials (line 299):**
Change `link: ''` to `link: m.link` so the original URL is preserved in the copy.

**Mini projects (lines 321-336):**
Add error handling to both the fetch and insert operations so any failures are logged and surfaced, matching the pattern used elsewhere.

**Toast message (line 340):**
Update the success message to reflect that URLs are now included, and mini projects are also copied.

## Summary of Changes
- 1 file modified: `src/pages/Admin.tsx`
- Pre-reading material links will be copied as-is
- Mini project duplication will have proper error logging to catch silent failures

