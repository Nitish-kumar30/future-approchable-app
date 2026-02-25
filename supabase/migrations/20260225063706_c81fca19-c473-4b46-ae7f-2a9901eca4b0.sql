
-- Create prompts table
CREATE TABLE public.prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view prompts
CREATE POLICY "Authenticated users can view prompts"
ON public.prompts FOR SELECT TO authenticated
USING (true);

-- Only admins can manage prompts
CREATE POLICY "Admins can create prompts"
ON public.prompts FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update prompts"
ON public.prompts FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete prompts"
ON public.prompts FOR DELETE
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_prompts_updated_at
BEFORE UPDATE ON public.prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
