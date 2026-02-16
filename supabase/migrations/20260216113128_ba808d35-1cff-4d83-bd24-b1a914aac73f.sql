
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'rating_received', 'friend_request', 'friend_accepted', 'transfer_received', 'streak_milestone', 'referral_reward', 'post_reward'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_notifications_user_id_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_id_read ON public.notifications (user_id, read);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify on rating received
CREATE OR REPLACE FUNCTION public.notify_on_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rater_username TEXT;
  v_post_content TEXT;
BEGIN
  SELECT username INTO v_rater_username FROM profiles WHERE user_id = NEW.rater_id;
  SELECT LEFT(content, 50) INTO v_post_content FROM posts WHERE id = NEW.post_id;
  
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.receiver_id,
    'rating_received',
    CASE WHEN NEW.value > 0 THEN '⬆️ Positive Rating!' ELSE '⬇️ Negative Rating' END,
    '@' || v_rater_username || ' rated your post ' || CASE WHEN NEW.value > 0 THEN '+' ELSE '' END || NEW.value,
    jsonb_build_object('post_id', NEW.post_id, 'value', NEW.value, 'rater', v_rater_username)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_rating_notify
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION notify_on_rating();

-- Trigger: notify on friend request
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username TEXT;
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT') THEN
    SELECT username INTO v_username FROM profiles WHERE user_id = NEW.requester_id;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.addressee_id,
      'friend_request',
      '👋 Friend Request',
      '@' || v_username || ' wants to be your friend!',
      jsonb_build_object('requester', v_username, 'friendship_id', NEW.id)
    );
  ELSIF NEW.status = 'accepted' AND TG_OP = 'UPDATE' THEN
    SELECT username INTO v_username FROM profiles WHERE user_id = NEW.addressee_id;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      '🎉 Friend Accepted!',
      '@' || v_username || ' accepted your friend request!',
      jsonb_build_object('friend', v_username)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_friend_notify
AFTER INSERT OR UPDATE ON friends
FOR EACH ROW
EXECUTE FUNCTION notify_on_friend_request();

-- Trigger: notify on transfer received
CREATE OR REPLACE FUNCTION public.notify_on_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_username TEXT;
BEGIN
  SELECT username INTO v_sender_username FROM profiles WHERE user_id = NEW.sender_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.receiver_id,
    'transfer_received',
    '💰 AURIX Received!',
    '@' || v_sender_username || ' sent you ' || (NEW.amount - NEW.fee) || ' AURIX!',
    jsonb_build_object('sender', v_sender_username, 'amount', NEW.amount - NEW.fee)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_transfer_notify
AFTER INSERT ON transfers
FOR EACH ROW
EXECUTE FUNCTION notify_on_transfer();
