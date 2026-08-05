# Skip payment for waitlist cohorts + stricter WhatsApp field

## 1. Waitlist cohorts skip payment

A cohort counts as a waitlist cohort when its label contains "waitlist" (case-insensitive). This is checked on both the form and the server, so the client cannot skip payment for a paid cohort.

- Form: when a waitlist cohort is selected, the button reads "Submit Registration" (no price), the commitment-fee copy and fee acknowledgement checkbox are hidden and not required, and submitting goes straight to the existing thank-you screen.
- Server (`trigger-registration-webhook`): if the cohort is a waitlist cohort, save the registration, fire the n8n webhook as usual, store `payment_status = 'waitlist'` with no amount/currency, skip Razorpay order creation, and return `{ success: true, skip_payment: true }`.
- Frontend treats `skip_payment: true` as success without opening Razorpay.
- Admin registrations list and CSV show "waitlist" alongside paid/pending.

Note: the cohort dropdown currently has one non-waitlist option. The rule kicks in automatically for any future option whose name includes "waitlist".

## 2. WhatsApp number validation

The field currently accepts any 5+ character string, so text like "India" passes.

- Accept digits only, with an optional single leading `+`. No spaces, dashes, brackets or letters.
- Length: 7 to 15 digits (E.164 range).
- The input strips disallowed characters as the user types, so a space or letter simply cannot be entered.
- Error message: "Enter a valid number with country code, digits only (e.g. +919876543210)".
- The edge function applies the same pattern check server-side.

## Technical notes

- Waitlist check helper shared in spirit between `src/pages/Registration.tsx` and `supabase/functions/trigger-registration-webhook/index.ts` (`/waitlist/i.test(cohort)`).
- Zod: `whatsapp_number: z.string().trim().regex(/^\+?\d{7,15}$/, ...)`.
- `fee_acknowledged` becomes conditionally required via a `superRefine` on the schema, keyed off the selected cohort.
- No database migration needed; `payment_status` is a free-text column.
