-- Remove chatbot-only data, configuration, rate limiting and RPCs.
-- Preserve shared website appointments and restrict their source to website only.
BEGIN;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_source_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_source_check CHECK (source = 'website');

DROP TABLE IF EXISTS public.chatbot_messages CASCADE;
DROP TABLE IF EXISTS public.chatbot_events CASCADE;
DROP TABLE IF EXISTS public.chatbot_leads CASCADE;
DROP TABLE IF EXISTS public.chatbot_conversations CASCADE;
DROP TABLE IF EXISTS public.chatbot_admin_config CASCADE;
DROP TABLE IF EXISTS public.chatbot_ai_settings CASCADE;
DROP TABLE IF EXISTS private.chatbot_rate_limits CASCADE;

DROP FUNCTION IF EXISTS public.chatbot_active_property_count() CASCADE;
DROP FUNCTION IF EXISTS public.chatbot_admin_access() CASCADE;
DROP FUNCTION IF EXISTS public.chatbot_admin_get_config() CASCADE;
DROP FUNCTION IF EXISTS public.chatbot_admin_health() CASCADE;
DROP FUNCTION IF EXISTS public.chatbot_search_index(text,text,text,numeric,integer) CASCADE;
DROP FUNCTION IF EXISTS public.chatbot_session_context(text,integer) CASCADE;
DROP FUNCTION IF EXISTS public.consume_chatbot_rate_limit(text,text,integer,integer) CASCADE;
DROP FUNCTION IF EXISTS public.record_chatbot_interaction(text,text,text,text,text,text,text,text,jsonb,jsonb,integer,boolean,jsonb) CASCADE;

COMMIT;
