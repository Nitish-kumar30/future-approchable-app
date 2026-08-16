# Verify registration gate on Live

Confirm that an approved, paid user on the Live environment can enroll in a cohort without being sent back to the registration form.

## Steps

1. Pick a real approved case on Live: query the live database (read-only) for an `approved` row in `cohort_registrations` and the matching cohort in `cohorts`, comparing the cohort name against the registration's cohort text.
2. Flag any name mismatches (stray/double spaces, casing) between the two, since that is what previously broke the match.
3. Call `check-registration-status` on the Live backend with that user's session and the matching `cohort_id`, and confirm the response is `{ approved: true }`.
4. Walk the enroll path in the preview against Live-equivalent data: cohort detail page -> Enroll -> confirm it enrolls instead of redirecting to `/registration`.
5. Report the result. If step 3 returns `approved: false`, identify whether it is a data mismatch (fix the cohort/registration text) or a code gap (function needs a redeploy to Live).

## Notes

- Read-only on Live: no inserts, updates, or migrations against the production database.
- No code changes planned unless step 5 finds a real gap; any fix would be proposed separately before implementing.
