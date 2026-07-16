ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_inr_paise integer,
  ADD COLUMN IF NOT EXISTS price_usd_cents integer;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_course_status
  ON public.payments (user_id, course_id, status);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.courses
SET price_inr_paise = 299900, price_usd_cents = 9900
WHERE slug = 'ai-mastery-for-working-professionals';