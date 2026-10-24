-- Add consultation-only applications to the existing owner-scoped intake table.
-- No payment order, price, worker or operator payment mirror is created.
alter table public.cjy_applications drop constraint cjy_applications_service_check;
alter table public.cjy_applications add constraint cjy_applications_service_check
  check (service in ('reels','cinematic'));
alter table public.cjy_applications drop constraint cjy_applications_plan_check;
alter table public.cjy_applications add constraint cjy_applications_plan_check
  check ((service='reels' and plan in ('Standard','Deluxe','Premium'))
      or (service='cinematic' and plan='Cinematic'));

create or replace function public.cjy_cinematic_application(
  p_user uuid, p_action text, p_draft uuid, p_form jsonb, p_policy jsonb, p_consent jsonb
) returns jsonb language plpgsql security invoker set search_path='pg_catalog' as $$
declare a public.cjy_applications;
begin
  if p_user is null or p_draft is null then raise exception 'owner required' using errcode='42501'; end if;
  if p_action is null or p_action not in ('save','submit')
     or p_form->>'service' is distinct from 'cinematic'
     or p_form->>'plan' is distinct from 'Cinematic'
     or p_form->'quantity' is distinct from '1'::jsonb
     or p_form->>'autoPost' is distinct from 'no'
     or p_form->>'existingAccount' is distinct from 'no'
     or p_form->>'channel' is distinct from 'manual'
  then raise exception 'cinematic form required' using errcode='23514'; end if;
  if p_action='submit' and p_consent is distinct from '{"version":"cjy-cinematic-2026-10-25","termsRefund":true,"privacy":true}'::jsonb
  then raise exception 'cinematic consent required' using errcode='23514'; end if;
  if p_action='save' and p_consent is distinct from '{"version":"cjy-draft-2026-10-02","privacy":true}'::jsonb
  then raise exception 'draft consent required' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_draft::text,0));
  select * into a from public.cjy_applications where request_key=p_draft for update;
  if found and a.auth_user_id is distinct from p_user then raise exception 'not owned' using errcode='42501'; end if;
  if a.id is not null and (a.retry_parent_id is not null or exists(select from public.cjy_orders where application_id=a.id)
       or (a.status<>'draft' and a.service<>'cinematic'))
  then raise exception 'existing application cannot convert' using errcode='23514'; end if;
  if a.service='cinematic' and a.status='submitted' then
    if p_action<>'submit' or a.current_snapshot is distinct from p_form
       or a.policy_snapshot is distinct from p_policy or a.consent_snapshot is distinct from p_consent
    then raise exception 'submission replay conflict' using errcode='23514'; end if;
    return public.cjy_application_command(p_user,'get',p_draft,'{}','{}','{}',0,'TEST','','');
  end if;
  return public.cjy_application_command(p_user,p_action,p_draft,p_form,p_policy,p_consent,0,'TEST','','');
end $$;
revoke all on function public.cjy_cinematic_application(uuid,text,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.cjy_cinematic_application(uuid,text,uuid,jsonb,jsonb,jsonb) to service_role;

-- Protect submitted consultation snapshots from the generic draft-save command.
create or replace function public.cjy_guard_cinematic_submission()
returns trigger language plpgsql set search_path='pg_catalog' as $$
begin
  if old.service='cinematic' and old.status='submitted'
     and row(new.service,new.plan,new.current_snapshot,new.policy_snapshot,new.consent_snapshot,new.status)
       is distinct from row(old.service,old.plan,old.current_snapshot,old.policy_snapshot,old.consent_snapshot,old.status)
  then raise exception 'submitted cinematic application immutable' using errcode='23514'; end if;
  return new;
end $$;
create trigger cjy_cinematic_submission_immutable before update on public.cjy_applications
for each row execute function public.cjy_guard_cinematic_submission();
