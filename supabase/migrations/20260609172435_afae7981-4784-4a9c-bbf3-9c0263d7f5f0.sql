CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.question_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exam text NOT NULL DEFAULT 'General',
  year text,
  class_level text,
  subject text NOT NULL DEFAULT 'General',
  topic text,
  question text NOT NULL,
  options jsonb,
  answer text,
  solution text,
  is_pyq boolean NOT NULL DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own qbank all" ON public.question_bank
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX question_bank_user_idx ON public.question_bank(user_id, created_at DESC);

CREATE TRIGGER qbank_updated_at BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();