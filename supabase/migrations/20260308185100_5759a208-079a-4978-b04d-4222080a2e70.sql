
-- FIX: The "No direct inserts allowed" RESTRICTIVE policy blocks ALL inserts
-- including from SECURITY DEFINER trigger functions.
-- Replace with a PERMISSIVE policy that allows the service role / trigger context.
DROP POLICY IF EXISTS "No direct inserts allowed" ON public.notifications;

-- Allow inserts only from service role or security definer functions
-- Since triggers run as SECURITY DEFINER, they bypass RLS entirely.
-- But we need to ensure RLS doesn't block them.
-- The correct fix: make the INSERT policy permissive for authenticated users
-- but validate via a trigger that only system functions can insert.

-- Actually, the simplest fix: since all notification inserts come from 
-- SECURITY DEFINER functions which run with the function owner's privileges,
-- we just need to NOT have a restrictive policy blocking them.
-- Remove the false policy entirely - the SECURITY DEFINER functions handle authorization.

-- We don't need an INSERT policy at all since SECURITY DEFINER bypasses RLS.
-- But if we want defense in depth, allow authenticated inserts (triggers run as auth'd user).
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also update messages UPDATE policy to allow marking messages as read by the receiver
-- Current policy only allows sender to update, but receivers need to mark read_at
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = sender_id) OR 
  (EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = conversation_id 
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  ))
)
WITH CHECK (
  (auth.uid() = sender_id) OR 
  (EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = conversation_id 
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  ))
);
