
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_event_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_event_paid(uuid) TO authenticated;
