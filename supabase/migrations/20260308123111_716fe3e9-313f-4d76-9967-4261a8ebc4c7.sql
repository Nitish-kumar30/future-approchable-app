
CREATE TABLE public.cohort_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  cohort TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  other_interest TEXT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  reason TEXT NOT NULL,
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cohort_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit registration"
ON public.cohort_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view registrations"
ON public.cohort_registrations
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update registrations"
ON public.cohort_registrations
FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete registrations"
ON public.cohort_registrations
FOR DELETE
TO authenticated
USING (is_admin());

CREATE TRIGGER update_cohort_registrations_updated_at
  BEFORE UPDATE ON public.cohort_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
