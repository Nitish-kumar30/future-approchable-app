## Goal
Improve the payment UX in `PaymentButton` (used in `CourseDetail` and in the footer via `StickyPayBar`) with clearer loading states, a post-payment confirmation step, celebratory confetti on success, and a support-friendly error message.

## Changes

### 1. `src/components/payment/PaymentButton.tsx`
- Introduce a single `status` state: `'idle' | 'opening' | 'confirming' | 'success' | 'error'`.
- Button behavior while any non-idle state is active:
  - `disabled = true`
  - Show `<Loader2 className="animate-spin" />` + label:
    - `opening` → "Processing…"
    - `confirming` → "Confirming your access…"
    - `success` → "Enrolled ✓"
- Flow:
  1. On click → `opening`; call `create-razorpay-order`, load Razorpay, open checkout.
  2. On Razorpay `handler` (payment done, before verify response) → `confirming`.
  3. Call `verify-razorpay-payment`.
     - Success → `success`, fire confetti, keep the toast, call `onPaid?.()` after a short delay so the confetti is visible.
     - Failure → `error`, show error toast (see below), reset to `idle` after toast.
  4. On Razorpay modal dismiss (no payment) → back to `idle`.
- Keep admin dual-currency block; apply the same status logic per-currency (track which currency is active).

### 2. Confetti
- Add `canvas-confetti` (tiny, ~2kb) via `bun add canvas-confetti @types/canvas-confetti`.
- On verify-success, fire a short burst from the button's bounding rect (or center-screen fallback).

### 3. Error toast copy
Replace the current generic error toasts (both order-create failure and verify failure) with:

> Title: **Payment could not be confirmed**
> Description: "Something went wrong: {error message}. Please take a screenshot and email it to ranbeer@gmail.com so we can help."
> Variant: destructive, duration ~10s so it's readable.

Apply this same messaging to:
- `create-razorpay-order` invoke error
- Razorpay script load failure
- `verify-razorpay-payment` invoke / signature error
- Any thrown error in the `try` block

### 4. `StickyPayBar`
No changes needed — it renders the same `PaymentButton`, so it inherits every improvement automatically. Verified from the current file.

## Out of scope
- No edge function changes.
- No DB changes.
- No changes to admin dual-button layout other than the shared status handling.

## Files touched
- `src/components/payment/PaymentButton.tsx` (logic + UI states + confetti trigger + new error copy)
- `package.json` (add `canvas-confetti`)

Confirm and I'll implement.