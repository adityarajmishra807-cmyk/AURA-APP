-- Fix FK to point to profiles instead of auth.users
ALTER TABLE public.posts DROP CONSTRAINT posts_user_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);