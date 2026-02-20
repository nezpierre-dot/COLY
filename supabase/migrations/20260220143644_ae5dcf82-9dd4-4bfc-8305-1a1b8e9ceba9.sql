
-- Allow users to delete their own roles (for toggle)
CREATE POLICY "Users can delete own roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own roles (for toggle)
CREATE POLICY "Users can insert own roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
