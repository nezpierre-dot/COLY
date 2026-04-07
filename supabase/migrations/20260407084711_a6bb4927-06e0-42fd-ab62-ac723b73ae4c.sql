
CREATE OR REPLACE FUNCTION public.admin_get_support_tickets(_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  subject text,
  message text,
  category text,
  status text,
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  reporter_name text,
  reporter_email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    st.id, st.user_id, st.subject, st.message, st.category, st.status,
    st.admin_reply, st.replied_at, st.created_at, st.updated_at,
    COALESCE(p.full_name, 'Anonyme') AS reporter_name,
    COALESCE(u.email, '') AS reporter_email
  FROM public.support_tickets st
  LEFT JOIN public.profiles p ON p.user_id = st.user_id
  LEFT JOIN auth.users u ON u.id = st.user_id
  ORDER BY
    CASE st.status WHEN 'open' THEN 0 WHEN 'replied' THEN 1 ELSE 2 END,
    st.created_at DESC
  LIMIT _limit;
END;
$$;
