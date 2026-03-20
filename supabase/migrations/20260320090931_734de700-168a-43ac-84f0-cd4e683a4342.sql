
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text DEFAULT null,
  ADD COLUMN IF NOT EXISTS pronouns text DEFAULT null,
  ADD COLUMN IF NOT EXISTS academic_year text DEFAULT null,
  ADD COLUMN IF NOT EXISTS branch text DEFAULT null,
  ADD COLUMN IF NOT EXISTS vibe_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
