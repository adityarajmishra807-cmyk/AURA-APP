CREATE OR REPLACE FUNCTION public.protect_profile_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Block direct client-side edits to protected financial fields.
  -- SECURITY DEFINER business logic functions run with a different current_user,
  -- so their updates are allowed through.
  IF current_user = 'authenticated' AND (
    OLD.aurix_balance IS DISTINCT FROM NEW.aurix_balance
    OR OLD.aurix_lifetime_earned IS DISTINCT FROM NEW.aurix_lifetime_earned
    OR OLD.aurix_lifetime_lost IS DISTINCT FROM NEW.aurix_lifetime_lost
    OR OLD.aurix_daily_earnings IS DISTINCT FROM NEW.aurix_daily_earnings
    OR OLD.aurix_daily_losses IS DISTINCT FROM NEW.aurix_daily_losses
    OR OLD.streak_count IS DISTINCT FROM NEW.streak_count
    OR OLD.highest_streak IS DISTINCT FROM NEW.highest_streak
    OR OLD.last_login_date IS DISTINCT FROM NEW.last_login_date
    OR OLD.referral_code IS DISTINCT FROM NEW.referral_code
  ) THEN
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

  RETURN NEW;
END;
$function$;