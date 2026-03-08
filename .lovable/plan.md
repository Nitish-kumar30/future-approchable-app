

## Plan: Harden Registration Edge Function

### Changes to `supabase/functions/trigger-registration-webhook/index.ts`

**1. CORS Origin Restriction**
- Replace `Access-Control-Allow-Origin: *` with a whitelist of allowed origins (`https://approachable.lovable.app` and the preview domain).
- Return 403 for requests from unknown origins.

**2. In-Memory Rate Limiting**
- Track request counts per IP using a `Map` with a 1-hour sliding window.
- Limit to 5 requests per IP per hour. Return `429 Too Many Requests` when exceeded.

**3. Input Validation**
- Validate email format with regex.
- Enforce max string lengths: name (100), email (255), whatsapp_number (20), cohort (100), company (100), role (100), reason (1000), additional_info (1000), other_interest (200).
- Validate `interests` is an array with max 10 items, each max 100 chars.

No other files need to change.

