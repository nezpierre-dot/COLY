-- Add last_seen_at column to profiles for "vu il y a X" presence fallback
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles (last_seen_at DESC);

-- RPC to update own last_seen_at (heartbeat from frontend, throttled client-side)
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.profiles
    SET last_seen_at = now()
    WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;