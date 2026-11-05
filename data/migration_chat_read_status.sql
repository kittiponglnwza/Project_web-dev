-- Run after migration_rubric.sql and migration_tenant_archive.sql.
-- Allow an authenticated tenant to mark only direct messages addressed to their own email as read.
CREATE OR REPLACE FUNCTION public.mark_received_chat_messages_read()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.messages
    SET is_read = TRUE
    WHERE receiver_email = auth.jwt() ->> 'email'
      AND sender_email = 'admin'
      AND is_read IS DISTINCT FROM TRUE;
$$;

REVOKE ALL ON FUNCTION public.mark_received_chat_messages_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_received_chat_messages_read() TO authenticated;
