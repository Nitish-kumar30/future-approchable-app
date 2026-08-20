# Go live: deploy check

## What I found

Reviewing the last two weeks of commits on `main`, all changes are frontend only:
custom video player, player setting persistence, HLS progress bar/expansion, mobile
end-of-video loader, sticky pay bar, footer margin, free-course playback fix, UI bug fixes.

- No new migration files were added (latest is `20260805101200_...sql`).
- The only backend file touched in that window was `check-registration-status`,
  which was already deployed to both Test and Live.

## Plan

1. Re-deploy `check-registration-status` to Test as a safety net (no code change),
   and confirm it responds.
2. Publish the project so the frontend changes go live (this also pushes any
   pending schema/function state to the Live backend).
3. Report the live URL and confirm the app loads after deploy.

## Notes

- No migrations to run, no new secrets needed.
- Frontend changes only reach Live via Publish; backend was already in sync.
