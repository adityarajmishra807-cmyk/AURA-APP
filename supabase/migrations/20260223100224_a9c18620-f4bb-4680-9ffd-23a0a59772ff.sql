
-- Create a trigger function that inserts a system message into the conversation
-- when a call status changes to ended, missed, or rejected
CREATE OR REPLACE FUNCTION public.insert_call_system_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_conversation_id UUID;
  v_p1 UUID;
  v_p2 UUID;
  v_caller_username TEXT;
  v_content TEXT;
  v_duration_seconds INTEGER;
  v_duration_text TEXT;
BEGIN
  -- Only fire when status changes to a terminal state
  IF NEW.status NOT IN ('ended', 'missed', 'rejected') THEN
    RETURN NEW;
  END IF;
  -- Don't fire if old status was already terminal
  IF OLD.status IN ('ended', 'missed', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get caller username
  SELECT username INTO v_caller_username FROM profiles WHERE user_id = NEW.caller_id;

  -- Build message content with special prefix
  IF NEW.status = 'ended' THEN
    -- Calculate duration
    IF NEW.ended_at IS NOT NULL THEN
      v_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at::timestamp - NEW.created_at::timestamp))::INTEGER;
      IF v_duration_seconds >= 60 THEN
        v_duration_text := (v_duration_seconds / 60)::TEXT || 'm ' || (v_duration_seconds % 60)::TEXT || 's';
      ELSE
        v_duration_text := v_duration_seconds::TEXT || 's';
      END IF;
    ELSE
      v_duration_text := '0s';
    END IF;
    v_content := '__call:ended:' || NEW.type || ':' || v_duration_text;
  ELSIF NEW.status = 'missed' THEN
    v_content := '__call:missed:' || NEW.type || ':';
  ELSIF NEW.status = 'rejected' THEN
    v_content := '__call:rejected:' || NEW.type || ':';
  END IF;

  -- Find or normalize conversation participants
  IF NEW.caller_id < NEW.receiver_id THEN
    v_p1 := NEW.caller_id; v_p2 := NEW.receiver_id;
  ELSE
    v_p1 := NEW.receiver_id; v_p2 := NEW.caller_id;
  END IF;

  SELECT id INTO v_conversation_id FROM conversations
  WHERE participant_1 = v_p1 AND participant_2 = v_p2;

  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (participant_1, participant_2)
    VALUES (v_p1, v_p2)
    RETURNING id INTO v_conversation_id;
  END IF;

  -- Insert system message (sender is caller)
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (v_conversation_id, NEW.caller_id, v_content);

  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER on_call_status_change
  AFTER UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_call_system_message();
