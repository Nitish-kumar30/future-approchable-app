

## Fix: Make n8n webhook call non-blocking

### Problem
The edge function awaits the n8n webhook response before sending the success response back to the client. If n8n takes a few seconds to respond, the submit button appears stuck.

### Solution
Fire the webhook without awaiting it. The DB insert is the critical path — once that succeeds, return immediately. The webhook runs in the background.

### Change
**File:** `supabase/functions/trigger-registration-webhook/index.ts` (lines 159-170)

Replace the awaited webhook call with a fire-and-forget pattern:

```typescript
// Trigger n8n webhook (fire-and-forget, don't block response)
fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ Name: name, Email: email, Cohort: cohort }),
}).then(r => r.text()).catch(err => console.error("Webhook trigger failed:", err));
```

Remove the `try/catch` block wrapping the webhook and the `await` keywords. The function returns success right after DB insert, and the webhook fires in the background.

Then redeploy the `trigger-registration-webhook` edge function.

