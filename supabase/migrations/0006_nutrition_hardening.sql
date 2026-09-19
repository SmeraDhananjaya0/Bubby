-- 0006_nutrition_hardening: lock down the trigger fn and pin search paths
revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.nutrition_day(date) set search_path = public;
alter function public.decide_proposal(text, text, jsonb) set search_path = public;

-- integration_tokens: no client access at all. Only edge functions (service
-- role, which bypasses RLS) read or write tokens. An explicit deny policy
-- documents the intent and silences the "RLS but no policy" lint.
drop policy if exists integration_tokens_no_client on public.integration_tokens;
create policy integration_tokens_no_client on public.integration_tokens
  for all using (false) with check (false);

-- Let a signed-in user see WHICH providers are connected (never the tokens).
create or replace function public.connected_providers()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(provider order by provider), '{}')
  from public.integration_tokens where user_id = auth.uid();
$$;
revoke execute on function public.connected_providers() from public, anon;
grant execute on function public.connected_providers() to authenticated;
