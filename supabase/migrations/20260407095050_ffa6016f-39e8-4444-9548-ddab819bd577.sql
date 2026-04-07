
DELETE FROM public.shipments WHERE status = 'cancelled';
DELETE FROM public.needit_missions WHERE status = 'cancelled';
DELETE FROM public.voyages WHERE status = 'cancelled';
