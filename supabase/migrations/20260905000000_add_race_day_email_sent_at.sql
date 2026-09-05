-- Idempotence de l'email J-1 (course), meme logique que weekly_reports.email_sent_at
-- mais porte sur profiles car l'email J-1 est un envoi one-shot par coureur, non lie
-- a une semaine de rapport. NULL = pas encore envoye ; horodate apres succes.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS race_day_email_sent_at TIMESTAMPTZ NULL;
