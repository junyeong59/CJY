-- Keep payment order IDs/FKs intact; consultation entries have no payment order.
alter table public.cjy_operator_orders drop constraint cjy_operator_orders_pkey;
alter table public.cjy_operator_orders alter column order_id drop not null;
alter table public.cjy_operator_orders add constraint cjy_operator_order_unique unique(order_id);
alter table public.cjy_operator_orders add column entry_id uuid
  generated always as (coalesce(order_id,application_id)) stored;
alter table public.cjy_operator_orders add primary key(entry_id);
alter table public.cjy_operator_orders add column entry_kind text not null default 'payment_order';
alter table public.cjy_operator_orders alter column amount drop not null;
alter table public.cjy_operator_orders alter column verified_at drop not null;
alter table public.cjy_operator_orders add constraint cjy_operator_application_fk
  foreign key(application_id) references public.cjy_applications(id) on delete cascade;
alter table public.cjy_operator_orders drop constraint cjy_operator_progress_stage_valid;
alter table public.cjy_operator_orders add constraint cjy_operator_entry_valid check (
 (entry_kind='payment_order' and order_id is not null and amount is not null and amount>0
  and verified_at is not null and order_progress_stage in (1,2,3,4))
 or
 (entry_kind='consultation' and order_id is null and service='cinematic' and plan='Cinematic'
  and status='상담 대기' and amount is null and paid_amount=0 and refunded_amount=0
  and paid_at is null and verified_at is null and order_progress_stage=0)
);

-- Generated columns are computed after BEFORE triggers: exclude entry_id in
-- the existing progress-only comparison, preserving all payment writeback rules.
create or replace function public.cjy_operator_progress_edit()
returns trigger language plpgsql set search_path='pg_catalog' as $$
DECLARE o public.cjy_orders;
BEGIN
 IF pg_trigger_depth()>1 AND current_user='postgres' THEN
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
 END IF;
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'trusted postgres editor required' USING ERRCODE='42501'; END IF;
 IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'operator mirror membership is source-owned' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'order_progress_stage'-'entry_id') IS DISTINCT FROM (to_jsonb(OLD)-'order_progress_stage'-'entry_id') THEN
  RAISE EXCEPTION 'only order_progress_stage may be edited' USING ERRCODE='23514';
 END IF;
 IF OLD.entry_kind='consultation' THEN
  RAISE EXCEPTION 'consultation is awaiting discussion, not paid production' USING ERRCODE='23514';
 END IF;
 IF NEW.order_progress_stage IS NULL OR NEW.order_progress_stage NOT IN (1,2,3,4) THEN
  RAISE EXCEPTION 'invalid provider progress stage' USING ERRCODE='23514';
 END IF;
 SELECT * INTO o FROM public.cjy_orders WHERE id=OLD.order_id FOR UPDATE;
 IF NOT FOUND OR o.paid_amount<=0 OR o.verified_at IS NULL THEN
  RAISE EXCEPTION 'verified paid-ever source order required' USING ERRCODE='23514';
 END IF;
 IF (o.provider='bank_transfer' AND (NEW.order_progress_stage<2 OR NEW.order_progress_stage<o.order_progress_stage)) OR
    (o.provider IS DISTINCT FROM 'bank_transfer' AND NEW.order_progress_stage>3) THEN
  RAISE EXCEPTION 'invalid provider progress or decrease' USING ERRCODE='23514';
 END IF;
 UPDATE public.cjy_orders SET order_progress_stage=NEW.order_progress_stage
  WHERE id=OLD.order_id AND order_progress_stage IS DISTINCT FROM NEW.order_progress_stage;
 RETURN NEW;
END $$;

-- Required definer: application writes originate from the trusted API, while
-- operator-table membership remains unwritable by client/reader roles.
create or replace function public.cjy_sync_cinematic_operator_entry()
returns trigger language plpgsql security definer set search_path='pg_catalog' as $$
begin
 if new.service='cinematic' and new.status='submitted' then
  insert into public.cjy_operator_orders
   (order_id,application_id,entry_kind,status,environment,customer_name,customer_phone,
    service,plan,auto_post,existing_account,brief,channel,amount,currency,paid_amount,
    refunded_amount,created_at,updated_at,synced_at,paid_at,verified_at,order_progress_stage)
  values
   (null,new.id,'consultation','상담 대기','LIVE',new.customer_name,new.customer_phone,
    new.service,new.plan,'no','no',new.brief,new.channel,null,'KRW',0,0,
    new.created_at,new.updated_at,clock_timestamp(),null,null,0)
  on conflict(entry_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.cjy_sync_cinematic_operator_entry() from public,anon,authenticated,service_role;
create trigger cjy_cinematic_operator_sync after insert or update of status on public.cjy_applications
for each row execute function public.cjy_sync_cinematic_operator_entry();

-- Backfill existing submitted requests once without re-emitting insert webhooks.
-- Both triggers are restored within this same migration transaction.
alter table public.cjy_operator_orders disable trigger cjy_operator_progress_edit;
alter table public.cjy_operator_orders disable trigger "My Watch Events webhook";
insert into public.cjy_operator_orders
 (order_id,application_id,entry_kind,status,environment,customer_name,customer_phone,
  service,plan,auto_post,existing_account,brief,channel,amount,currency,paid_amount,
  refunded_amount,created_at,updated_at,synced_at,paid_at,verified_at,order_progress_stage)
select null,a.id,'consultation','상담 대기','LIVE',a.customer_name,a.customer_phone,
 a.service,a.plan,'no','no',a.brief,a.channel,null,'KRW',0,0,
 a.created_at,a.updated_at,clock_timestamp(),null,null,0
from public.cjy_applications a
where a.service='cinematic' and a.status='submitted'
  and not exists(select from public.cjy_orders o where o.application_id=a.id)
on conflict(entry_id) do nothing;
alter table public.cjy_operator_orders enable trigger cjy_operator_progress_edit;
alter table public.cjy_operator_orders enable trigger "My Watch Events webhook";
