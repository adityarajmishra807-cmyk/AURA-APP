
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_username TEXT;
BEGIN
  -- Try to get username from metadata (email/password signup)
  v_username := NEW.raw_user_meta_data->>'username';
  
  -- If no username (e.g. Google OAuth), generate from name or email
  IF v_username IS NULL OR v_username = '' THEN
    v_username := NEW.raw_user_meta_data->>'full_name';
    IF v_username IS NOT NULL AND v_username != '' THEN
      -- Replace spaces with underscores, lowercase, append random suffix
      v_username := lower(replace(v_username, ' ', '_')) || '_' || substr(gen_random_uuid()::text, 1, 4);
    ELSE
      -- Fallback: use email prefix
      v_username := split_part(NEW.email, '@', 1) || '_' || substr(gen_random_uuid()::text, 1, 4);
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, v_username);
  RETURN NEW;
END;
$function$;
