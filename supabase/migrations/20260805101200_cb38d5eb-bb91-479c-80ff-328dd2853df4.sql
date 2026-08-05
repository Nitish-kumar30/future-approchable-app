ALTER TABLE public.cohort_registrations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS amount integer,
  ADD COLUMN IF NOT EXISTS currency text;

CREATE INDEX IF NOT EXISTS cohort_registrations_razorpay_order_id_idx
  ON public.cohort_registrations (razorpay_order_id);