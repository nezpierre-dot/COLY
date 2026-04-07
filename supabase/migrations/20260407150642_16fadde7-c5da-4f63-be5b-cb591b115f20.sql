
DROP POLICY "System can insert alerts" ON public.admin_alerts;
CREATE POLICY "Admins can insert alerts" ON public.admin_alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
