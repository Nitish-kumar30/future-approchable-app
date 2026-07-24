## Deploy latest commits to Test

Recent commits since the last full deploy touch one migration, one edge function, and frontend-only changes.

### 1. Apply pending migration (Test)
- `20260724170000_atomic_chapter_progress.sql` — creates `public.upsert_chapter_progress` RPC (verified missing on Test). Fixes chapter progress race condition.

### 2. Deploy edge functions
- `update-chapter-progress` — now calls the new RPC (b74b51b).
- `issue-certificate`, `request-certificate`, `download-certificate` — pick up dark-theme v2 template, bundled logo base64, and self-serve foundation flow (4374db1, 512e35b, e2e565b, 6adb4e5).

### 3. Frontend
Auto-deploys to Test preview on save. Live requires the user to click **Publish → Update**. Includes: progress persistence fixes, mobile sticky pay-bar spacing, dark certificate UI, prompt page fix, quiz button highlight, self-serve foundation download.

### 4. Reminder
`BROWSERLESS_API_KEY` still not set — PDF issuance will fail cleanly with "not configured" until added.
