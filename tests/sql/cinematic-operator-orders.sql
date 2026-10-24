-- Runs against the existing CJY schema. All synthetic data and trigger changes roll back.
begin;
alter table public.cjy_operator_orders disable trigger "My Watch Events webhook";
do $$
declare u uuid:=gen_random_uuid(); k uuid:=gen_random_uuid(); a jsonb; again jsonb;
 mirror public.cjy_operator_orders; payment jsonb; oid uuid; other_key uuid:=gen_random_uuid();
 f jsonb:='{"customerName":"TEST cinematic","customerPhone":"01000000000","service":"cinematic","plan":"Cinematic","autoPost":"no","existingAccount":"no","brief":"Synthetic rolled-back operator validation","channel":"manual","quantity":1}';
 c jsonb:='{"version":"cjy-cinematic-2026-10-25","termsRefund":true,"privacy":true}';
 p jsonb:='{"schemaVersion":1,"effectiveState":"effective-bank-transfer-service","documents":[{"kind":"terms","versionDate":"2026-10-21","canonicalSha256":"5375731a78d9411ccd4d8d12cc28626a7fbbbec3dd5cbda8b6c31d9759f792dd"},{"kind":"privacy","versionDate":"2026-10-21","canonicalSha256":"8a08fead29e1d23169337065997539cb636af322901e156a32592b26470bbd7e"},{"kind":"refund","versionDate":"2026-10-21","canonicalSha256":"37be29125d2d86bd324fb7bba2e14dc283af0c9d84f896e56a9230e499d95857"}]}';
begin
 a:=public.cjy_cinematic_application(u,'save',k,f,p,'{"version":"cjy-draft-2026-10-02","privacy":true}');
 if exists(select from public.cjy_operator_orders where application_id=(a->>'id')::uuid) then raise exception 'draft leaked into operator list'; end if;
 a:=public.cjy_cinematic_application(u,'submit',k,f,p,c);
 select * into strict mirror from public.cjy_operator_orders where application_id=(a->>'id')::uuid;
 if mirror.status<>'상담 대기' or mirror.entry_kind<>'consultation' or mirror.entry_id<>(a->>'id')::uuid
    or mirror.service<>'cinematic' or mirror.plan<>'Cinematic' or mirror.customer_name<>'TEST cinematic'
    or mirror.order_id is not null or mirror.amount is not null or mirror.paid_amount<>0
    or mirror.paid_at is not null or mirror.verified_at is not null or mirror.order_progress_stage<>0
 then raise exception 'invalid consultation mirror'; end if;
 again:=public.cjy_cinematic_application(u,'submit',k,f,p,c);
 if again->>'id' is distinct from a->>'id' or (select count(*) from public.cjy_operator_orders where application_id=(a->>'id')::uuid)<>1
 then raise exception 'duplicate consultation'; end if;
 if exists(select from public.cjy_orders where application_id=(a->>'id')::uuid) then raise exception 'fake payment created'; end if;
 begin
  update public.cjy_operator_orders set order_progress_stage=2 where entry_id=mirror.entry_id;
  raise exception 'consultation promoted to payment';
 exception when check_violation then null;end;
 begin
  perform public.cjy_cinematic_application(gen_random_uuid(),'submit',k,f,p,c);raise exception 'owner bypass';
 exception when insufficient_privilege then null;end;
 -- Existing bank orders continue to mirror and accept their progress writeback.
 payment:=public.cjy_bank_transfer_order(u,other_key,f||'{"service":"reels","plan":"Standard"}',p,
  '{"version":"cjy-bank-transfer-2026-10-14","termsRefund":true,"privacy":true}');
 oid:=(payment->'order'->>'id')::uuid;
 if oid is null then raise exception 'bank order missing'; end if;
 if exists(select from public.cjy_operator_orders where order_id=oid) then raise exception 'unpaid bank order mirrored'; end if;
 update public.cjy_orders set order_progress_stage=2 where id=oid;
 select * into strict mirror from public.cjy_operator_orders where order_id=oid;
 if mirror.entry_kind<>'payment_order' or mirror.entry_id<>oid or mirror.status<>'paid' or mirror.amount<>5390 then raise exception 'payment mirror regression'; end if;
 update public.cjy_operator_orders set order_progress_stage=3 where order_id=oid;
 if (select order_progress_stage from public.cjy_orders where id=oid)<>3 then raise exception 'payment writeback regression'; end if;
 begin
  update public.cjy_operator_orders set order_progress_stage=2 where order_id=oid;raise exception 'payment stage decrease bypass';
 exception when check_violation then null;end;
end $$;
rollback;
