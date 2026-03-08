
-- ============================================================
-- CRITICAL FIX 1: Restrict profiles UPDATE to safe columns only
-- Prevents users from directly modifying aurix_balance, etc.
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
);

-- Create a trigger to prevent financial field tampering
CREATE OR REPLACE FUNCTION public.protect_profile_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent users from modifying financial fields directly
  -- These should only be modified by SECURITY DEFINER functions
  IF OLD.aurix_balance IS DISTINCT FROM NEW.aurix_balance
     OR OLD.aurix_lifetime_earned IS DISTINCT FROM NEW.aurix_lifetime_earned
     OR OLD.aurix_lifetime_lost IS DISTINCT FROM NEW.aurix_lifetime_lost
     OR OLD.aurix_daily_earnings IS DISTINCT FROM NEW.aurix_daily_earnings
     OR OLD.aurix_daily_losses IS DISTINCT FROM NEW.aurix_daily_losses
     OR OLD.streak_count IS DISTINCT FROM NEW.streak_count
     OR OLD.highest_streak IS DISTINCT FROM NEW.highest_streak
     OR OLD.last_login_date IS DISTINCT FROM NEW.last_login_date
     OR OLD.referral_code IS DISTINCT FROM NEW.referral_code
  THEN
    -- Check if the caller is a security definer function (not direct user call)
    -- If current_setting returns 'on', it's a trusted context
    IF current_setting('role', true) = 'authenticated' THEN
      -- Reset financial fields to their original values
      NEW.aurix_balance := OLD.aurix_balance;
      NEW.aurix_lifetime_earned := OLD.aurix_lifetime_earned;
      NEW.aurix_lifetime_lost := OLD.aurix_lifetime_lost;
      NEW.aurix_daily_earnings := OLD.aurix_daily_earnings;
      NEW.aurix_daily_losses := OLD.aurix_daily_losses;
      NEW.streak_count := OLD.streak_count;
      NEW.highest_streak := OLD.highest_streak;
      NEW.last_login_date := OLD.last_login_date;
      NEW.referral_code := OLD.referral_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_financials ON public.profiles;
CREATE TRIGGER protect_profile_financials
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_financial_fields();

-- ============================================================
-- CRITICAL FIX 2: Remove user INSERT on aurix_transactions
-- Only SECURITY DEFINER functions should insert transactions
-- ============================================================
DROP POLICY IF EXISTS "System can insert transactions" ON public.aurix_transactions;

CREATE POLICY "No direct inserts on transactions"
ON public.aurix_transactions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- ============================================================
-- WARNING FIX: Conversations UPDATE - prevent participant tampering
-- ============================================================
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING ((auth.uid() = participant_1) OR (auth.uid() = participant_2))
WITH CHECK (
  (auth.uid() = participant_1) OR (auth.uid() = participant_2)
);

-- Trigger to protect conversation participant fields
CREATE OR REPLACE FUNCTION public.protect_conversation_participants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.participant_1 IS DISTINCT FROM NEW.participant_1
     OR OLD.participant_2 IS DISTINCT FROM NEW.participant_2
  THEN
    NEW.participant_1 := OLD.participant_1;
    NEW.participant_2 := OLD.participant_2;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_conversation_participants ON public.conversations;
CREATE TRIGGER protect_conversation_participants
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_conversation_participants();

-- ============================================================
-- WARNING FIX: Messages UPDATE - prevent conversation_id/sender_id changes
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.protect_message_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.conversation_id := OLD.conversation_id;
  NEW.sender_id := OLD.sender_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_message_fields ON public.messages;
CREATE TRIGGER protect_message_fields
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_message_immutable_fields();

-- ============================================================
-- WARNING FIX: Friends UPDATE - restrict to status changes only
-- ============================================================
DROP POLICY IF EXISTS "Users can update friendships addressed to them" ON public.friends;

CREATE POLICY "Users can update friendships addressed to them"
ON public.friends
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);

CREATE OR REPLACE FUNCTION public.protect_friend_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.requester_id := OLD.requester_id;
  NEW.addressee_id := OLD.addressee_id;
  NEW.created_at := OLD.created_at;
  -- Only allow valid status transitions
  IF NEW.status NOT IN ('accepted', 'rejected') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_friend_fields ON public.friends;
CREATE TRIGGER protect_friend_fields
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_friend_immutable_fields();

-- ============================================================
-- WARNING FIX: Calls UPDATE - prevent caller/receiver tampering
-- ============================================================
DROP POLICY IF EXISTS "Participants can update their calls" ON public.calls;

CREATE POLICY "Participants can update their calls"
ON public.calls
FOR UPDATE
TO authenticated
USING ((auth.uid() = caller_id) OR (auth.uid() = receiver_id))
WITH CHECK ((auth.uid() = caller_id) OR (auth.uid() = receiver_id));

CREATE OR REPLACE FUNCTION public.protect_call_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.caller_id := OLD.caller_id;
  NEW.receiver_id := OLD.receiver_id;
  NEW.type := OLD.type;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_call_fields ON public.calls;
CREATE TRIGGER protect_call_fields
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_call_immutable_fields();

-- ============================================================
-- WARNING FIX: Restrict public-facing SELECT policies to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Authenticated users can view likes"
ON public.post_likes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);
