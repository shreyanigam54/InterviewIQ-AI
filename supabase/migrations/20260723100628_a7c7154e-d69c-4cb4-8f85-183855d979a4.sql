
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
-- authenticated retains EXECUTE on has_role because RLS policies call it as the current user.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
