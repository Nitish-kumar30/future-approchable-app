# Add payment to the registration form

Rename the registration button to "Submit Registration & Pay" and make one click do: save the registration, fire the n8n webhook, open Razorpay checkout, verify the payment, and land the user back on the registration page in a paid/thank-you state.

## Flow

```text
Click "Submit Registration & Pay"
  -> (Processing...)  save registration + fire n8n webhook + create Razorpay order
  -> Razorpay checkout opens
  -> (Confirming...) verify signature, mark registration paid
  -> success: confetti + Thank You screen on /registration
```

Button states mirror the course payment button: idle -> "Processing..." -> "Confirming your access..." -> "Registered" (disabled + spinner throughout). Modal dismissal or payment failure resets to idle with a toast; the registration row stays saved as `payment_status = 'pending'` so nothing is lost.

## Pricing and currency

- India -> INR, everyone else -> USD, based on the country already selected in the form.
- Amounts come from `src/lib/constants.ts` (`COHORT_CONFIG`); numeric fields are added there (`priceIndiaPaise: 349900`, `priceInternationalCents: 9900`) and the existing display strings stay. The server never trusts an amount from the client — it reads these from a server-side constant in the edge function.

## Backend changes

1. **Migration** on `cohort_registrations`: add `payment_status text not null default 'pending'`, `razorpay_order_id text`, `razorpay_payment_id text`, `amount integer`, `currency text`. Index on `razorpay_order_id`.
2. **`trigger-registration-webhook`** (existing, public): after inserting the row and firing the webhook, also create a Razorpay order with the server-side amount and return `{ registration_id, razorpay_order_id, key_id, amount, currency }`. Keeps existing validation, rate limiting, and CORS whitelist.
3. **New public edge function `verify-registration-payment`**: takes order id, payment id, signature; verifies the HMAC signature with `_shared/razorpay.ts`; on match updates the matching registration to `payment_status = 'paid'` with the payment id. Rejects anything unsigned. No auth required (registration is an unauthenticated form), which is safe because only a valid Razorpay signature can flip the status.

## Frontend changes

- `src/pages/Registration.tsx`: lazy-load Razorpay via existing `loadRazorpay.ts`, drive the three-state button, prefill name/email/phone from the form, handle `payment.failed` and `ondismiss`, then show the existing Thank You screen (with confetti and the GA conversion event) on success.
- Button label: "Submit Registration & Pay Rs 3,499" / "... $99" depending on the selected country; falls back to "Submit Registration & Pay" before a country is picked.

## Admin

Registrations list and CSV export gain a Payment column (paid / pending) so unpaid submissions are visible.

## Assumptions

- Prices: Rs 3,499 (India) and $99 (international), matching the current copy.
- "Redirect to the current page" is interpreted as staying on `/registration` and showing the existing Thank You screen after a successful payment.
