CREATE OR REPLACE FUNCTION public.toggle_user_role(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_role app_role;
  _new_role app_role;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot change another user role';
  END IF;

  -- Get current role (prefer non-admin)
  SELECT role INTO _current_role
  FROM public.user_roles
  WHERE user_id = _user_id AND role != 'admin'
  ORDER BY role ASC
  LIMIT 1;

  IF _current_role IS NULL THEN
    RAISE EXCEPTION 'No role found for user';
  END IF;

  IF _current_role = 'demandeur' THEN
    _new_role := 'voyageur';
  ELSIF _current_role = 'voyageur' THEN
    _new_role := 'demandeur';
  ELSE
    RAISE EXCEPTION 'Cannot change role from %', _current_role;
  END IF;

  -- Delete all non-admin roles for this user, then insert the new one
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role != 'admin';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _new_role);

  RETURN _new_role::text;
END;
$function$;