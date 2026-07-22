## Goal
Serve the Apple Pay domain verification file at `/.well-known/apple-developer-merchantid-domain-association` on all published domains (`approachable.lovable.app`, `learn.approachable.dev`) so Razorpay can enable Apple Pay in checkout.

## Steps

1. **Copy the uploaded file into `public/.well-known/`**
   - Path: `public/.well-known/apple-developer-merchantid-domain-association` (no file extension — required by Apple).
   - Vite serves everything under `public/` at the site root, so it will be reachable at:
     - `https://approachable.lovable.app/.well-known/apple-developer-merchantid-domain-association`
     - `https://learn.approachable.dev/.well-known/apple-developer-merchantid-domain-association`
   - The SPA fallback only kicks in for unknown routes; real static files under `public/` are served as-is with `Content-Type: application/octet-stream` (or text) and a `200`, which is what Apple/Razorpay require.

2. **Publish**
   - This is a frontend/static asset change, so it only goes live after clicking **Publish → Update** in Lovable.

3. **Register the domain in Razorpay dashboard**
   - After publish, in the Razorpay dashboard → Apple Pay → add domain → enter `learn.approachable.dev` (and any other domain you want Apple Pay on).
   - Razorpay will fetch the file from `/.well-known/...` and mark the domain verified. No code changes needed on the checkout side — once verified, Razorpay auto-shows Apple Pay on Safari/iOS for eligible users.

## Files touched
- `public/.well-known/apple-developer-merchantid-domain-association` (new, copied verbatim from your upload)

## Out of scope
- No changes to `PaymentButton`, edge functions, or Razorpay order creation — Apple Pay rides on the existing Razorpay checkout once the domain is verified.
- Custom domain `learn.approachable.dev` must already be Active (it is). If you also want Apple Pay on the raw `.lovable.app` subdomain, register that in Razorpay too — same file serves both.

Confirm and I'll implement.
