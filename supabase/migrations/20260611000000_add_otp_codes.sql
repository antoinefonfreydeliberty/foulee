CREATE TABLE IF NOT EXISTS public.otp_codes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT        NOT NULL,
  code_hash   TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  attempts    INTEGER     NOT NULL DEFAULT 0,
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON public.otp_codes(email);

-- RLS activé mais sans policy : seul le service role peut accéder
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
