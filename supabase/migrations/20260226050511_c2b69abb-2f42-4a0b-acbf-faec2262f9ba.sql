
-- Add nullable user_id column to prompts (NULL = admin prompt, non-null = user prompt)
ALTER TABLE public.prompts ADD COLUMN user_id uuid DEFAULT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can view prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admins can create prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admins can update prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admins can delete prompts" ON public.prompts;

-- SELECT: Users can see admin prompts (user_id IS NULL) + their own prompts
CREATE POLICY "Users can view admin and own prompts"
  ON public.prompts FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR is_admin());

-- INSERT: Admins can create admin prompts; users can create their own
CREATE POLICY "Users can create own prompts"
  ON public.prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid())
    OR (user_id IS NULL AND is_admin())
  );

-- UPDATE: Admins can update admin prompts; users can update their own
CREATE POLICY "Users can update own prompts"
  ON public.prompts FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid())
    OR (user_id IS NULL AND is_admin())
  );

-- DELETE: Admins can delete admin prompts; users can delete their own
CREATE POLICY "Users can delete own prompts"
  ON public.prompts FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid())
    OR (user_id IS NULL AND is_admin())
  );
