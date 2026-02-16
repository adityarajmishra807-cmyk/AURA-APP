
-- Replace the overly permissive INSERT policy with one that only allows service role / trigger inserts
-- Drop the old policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Since notifications are only created by SECURITY DEFINER triggers, 
-- no user should directly insert. Deny all direct inserts.
CREATE POLICY "No direct inserts allowed"
ON public.notifications FOR INSERT
WITH CHECK (false);
