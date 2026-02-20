
-- Create trigger function to notify on new message
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_username TEXT;
  v_receiver_id UUID;
  v_short_content TEXT;
BEGIN
  -- Get sender username
  SELECT username INTO v_sender_username FROM profiles WHERE user_id = NEW.sender_id;

  -- Get the other participant (receiver) from conversations
  SELECT 
    CASE 
      WHEN participant_1 = NEW.sender_id THEN participant_2
      ELSE participant_1
    END INTO v_receiver_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Truncate content for preview
  v_short_content := LEFT(NEW.content, 60);
  IF LENGTH(NEW.content) > 60 THEN
    v_short_content := v_short_content || '…';
  END IF;

  -- Insert notification for receiver
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_receiver_id,
    'new_message',
    '💬 ' || COALESCE(v_sender_username, 'Someone') || ' sent you a message',
    v_short_content,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_username', v_sender_username,
      'message_id', NEW.id
    )
  );

  RETURN NEW;
END;
$function$;

-- Create the trigger on messages table
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON public.messages;
CREATE TRIGGER trigger_notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
