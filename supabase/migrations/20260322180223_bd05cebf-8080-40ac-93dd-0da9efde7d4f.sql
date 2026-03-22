
CREATE TABLE public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  q1_ease_of_use integer CHECK (q1_ease_of_use BETWEEN 1 AND 5),
  q2_design integer CHECK (q2_design BETWEEN 1 AND 5),
  q3_performance integer CHECK (q3_performance BETWEEN 1 AND 5),
  q4_usefulness integer CHECK (q4_usefulness BETWEEN 1 AND 5),
  q5_recommend integer CHECK (q5_recommend BETWEEN 1 AND 5),
  q6_like_most text,
  q7_problems text,
  q8_missing_feature text,
  q9_improve_experience text,
  q10_change_one_thing text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON public.app_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON public.app_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
