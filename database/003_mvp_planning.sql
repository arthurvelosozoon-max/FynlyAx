begin;
create function public.fynlyax_valid_state_v1(payload jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; pref jsonb; entry record; ids text[]; targets text[];
begin
 if jsonb_typeof(payload) is distinct from 'object' or not payload ?& array['prefs','accounts','transactions','goals','limits']
 or octet_length(payload::text)>2000000 or (select count(*) from jsonb_object_keys(payload))<>5 then return false; end if;
 pref:=payload->'prefs';
 if jsonb_typeof(pref) is distinct from 'object' or not pref ?& array['locale','theme','accent','hidden','name','lastName','currency','widgets'] then return false;end if;
 if (pref->>'locale') not in ('pt-BR','en-US','es-ES') or (pref->>'theme') not in ('dark','light','system')
 or (pref->>'currency') not in ('BRL','USD','EUR','GBP') or coalesce(pref->>'accent','')!~'^#[0-9a-fA-F]{6}$'
 or jsonb_typeof(pref->'hidden') is distinct from 'boolean' or jsonb_typeof(pref->'name') is distinct from 'string'
 or jsonb_typeof(pref->'lastName') is distinct from 'string' or length(pref->>'name')>40 or length(pref->>'lastName')>60
 or jsonb_typeof(pref->'widgets') is distinct from 'array' then return false;end if;
 if pref->>'locale' is null or pref->>'theme' is null or pref->>'currency' is null then return false;end if;
 if jsonb_array_length(pref->'widgets')>4 or exists(select 1 from jsonb_array_elements_text(pref->'widgets') w where w not in ('available','income','expense','savings'))
 or (select count(*)<>count(distinct w) from jsonb_array_elements_text(pref->'widgets') w) then return false;end if;
 if jsonb_typeof(payload->'accounts') is distinct from 'array' or jsonb_typeof(payload->'transactions') is distinct from 'array'
 or jsonb_typeof(payload->'goals') is distinct from 'array' or jsonb_typeof(payload->'limits') is distinct from 'object' then return false;end if;
 if jsonb_array_length(payload->'accounts')>100 or jsonb_array_length(payload->'transactions')>10000 or jsonb_array_length(payload->'goals')>100 then return false;end if;
 ids:=array[]::text[];
 for item in select value from jsonb_array_elements(payload->'accounts') loop
  if jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 80 or item->>'id'=any(ids)
  or jsonb_typeof(item->'name') is distinct from 'string' or length(trim(item->>'name')) not between 1 and 50
  or item->>'currency' is distinct from 'BRL' or not public.fynlyax_valid_cents(item->'opening')
  or coalesce(item->>'color','')!~'^#[0-9a-fA-F]{6}$' then return false;end if;
  ids:=array_append(ids,item->>'id');
 end loop;
 targets:=ids;ids:=array[]::text[];
 for item in select value from jsonb_array_elements(payload->'transactions') loop
  if jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 80 or item->>'id'=any(ids)
  or jsonb_typeof(item->'description') is distinct from 'string' or length(trim(item->>'description')) not between 1 and 120
  or not public.fynlyax_valid_cents(item->'amount',false) or not coalesce(item->>'account'=any(targets),false)
  or not coalesce(item->>'type' in ('income','expense','transfer'),false) or not coalesce(item->>'status' in ('paid','pending'),false)
  or not coalesce(item->>'category' in ('home','food','transport','health','leisure','salary','freelance','other'),false)
  or coalesce(item->>'date','')!~'^\d{4}-\d{2}-\d{2}$' then return false;end if;
  perform (item->>'date')::date;
  if item->>'type'='transfer' then
   if not coalesce(item->>'destination'=any(targets),false) or item->>'destination'=item->>'account' then return false;end if;
  elsif item ? 'destination' then return false;end if;
  ids:=array_append(ids,item->>'id');
 end loop;
 ids:=array[]::text[];
 for item in select value from jsonb_array_elements(payload->'goals') loop
  if jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 80 or item->>'id'=any(ids)
  or jsonb_typeof(item->'name') is distinct from 'string' or length(trim(item->>'name')) not between 1 and 120
  or not public.fynlyax_valid_cents(item->'target',false) or not public.fynlyax_valid_cents(item->'current')
  or (item->>'current')::numeric>(item->>'target')::numeric or coalesce(item->>'color','')!~'^#[0-9a-fA-F]{6}$' then return false;end if;
  ids:=array_append(ids,item->>'id');
 end loop;
 for entry in select key,value from jsonb_each(payload->'limits') loop
  if entry.key not in ('home','food','transport','health','leisure','salary','freelance','other') or not public.fynlyax_valid_cents(entry.value,false) then return false;end if;
 end loop;
 return true;
exception when others then return false;
end$$;
create or replace function public.fynlyax_valid_state(payload jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; payment jsonb; entry record; budget jsonb; base jsonb; cats text[]:=array['home','food','transport','health','leisure','salary','freelance','other']; ids text[]; card_ids text[]; seen text[];
begin
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>2000000 then return false;end if;
 if exists(select 1 from jsonb_object_keys(payload) k where k not in ('prefs','accounts','transactions','goals','limits','cards','cardCharges','customCategories','monthlyLimits')) then return false;end if;
 if jsonb_typeof(coalesce(payload->'customCategories','[]')) is distinct from 'array' or jsonb_typeof(coalesce(payload->'cards','[]')) is distinct from 'array' or jsonb_typeof(coalesce(payload->'cardCharges','[]')) is distinct from 'array' or jsonb_typeof(coalesce(payload->'monthlyLimits','{}')) is distinct from 'object' then return false;end if;
 if jsonb_array_length(coalesce(payload->'customCategories','[]'))>100 or jsonb_array_length(coalesce(payload->'cards','[]'))>50 or jsonb_array_length(coalesce(payload->'cardCharges','[]'))>10000 then return false;end if;
 for item in select value from jsonb_array_elements(coalesce(payload->'customCategories','[]')) loop
  if jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 80 or item->>'id'=any(cats) or jsonb_typeof(item->'name') is distinct from 'string' or length(trim(item->>'name')) not between 1 and 50 then return false;end if;
  cats:=array_append(cats,item->>'id');
 end loop;
 card_ids:=array[]::text[];
 for item in select value from jsonb_array_elements(coalesce(payload->'cards','[]')) loop
  if jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 80 or item->>'id'=any(card_ids) or jsonb_typeof(item->'name') is distinct from 'string' or length(trim(item->>'name')) not between 1 and 50 or not public.fynlyax_valid_cents(item->'limit',false) then return false;end if;
  if not public.fynlyax_valid_cents(item->'closingDay',false) or not public.fynlyax_valid_cents(item->'dueDay',false) or (item->>'closingDay')::numeric>31 or (item->>'dueDay')::numeric>31 then return false;end if;
  card_ids:=array_append(card_ids,item->>'id');
 end loop;
 ids:=array[]::text[];
 for item in select value from jsonb_array_elements(coalesce(payload->'cardCharges','[]')) loop
  if jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 72 or item->>'id'=any(ids) or not coalesce(item->>'cardId'=any(card_ids),false) or not coalesce(item->>'category'=any(cats),false) or not public.fynlyax_valid_cents(item->'amount',false) or jsonb_typeof(item->'description') is distinct from 'string' or length(trim(item->>'description')) not between 1 and 120 or coalesce(item->>'date','')!~'^\d{4}-\d{2}-\d{2}$' then return false;end if;
  perform (item->>'date')::date;
  select value into payment from jsonb_array_elements(payload->'transactions') where value->>'id'='invoice:'||(item->>'id');
  if payment is not null and (payment->>'type' is distinct from 'expense' or payment->>'status' is distinct from 'paid' or payment->'amount' is distinct from item->'amount' or payment->>'category' is distinct from item->>'category') then return false;end if;
  ids:=array_append(ids,item->>'id');
 end loop;
 for item in select value from jsonb_array_elements(payload->'transactions') loop
  if not coalesce(item->>'category'=any(cats),false) then return false;end if;
 end loop;
 for entry in select key,value from jsonb_each(coalesce(payload->'monthlyLimits','{}')) loop
  if entry.key!~'^\d{4}-(0[1-9]|1[0-2])$' or jsonb_typeof(entry.value) is distinct from 'object' then return false;end if;
 end loop;
 for budget in select value from jsonb_each(coalesce(payload->'monthlyLimits','{}')) union all select payload->'limits' loop
  if jsonb_typeof(budget) is distinct from 'object' then return false;end if;
  for entry in select key,value from jsonb_each(budget) loop
   if not entry.key=any(cats) or not public.fynlyax_valid_cents(entry.value,false) then return false;end if;
  end loop;
 end loop;
 base:=payload-array['cards','cardCharges','customCategories','monthlyLimits'];
 base:=jsonb_set(base,'{transactions}',coalesce((select jsonb_agg(jsonb_set(value,'{category}','"other"')) from jsonb_array_elements(payload->'transactions')),'[]'));
 base:=jsonb_set(base,'{limits}','{}');
 return public.fynlyax_valid_state_v1(base);
exception when others then return false;
end$$;

-- Per-user quota: 20 requests/hour, and at least 10 seconds between requests.
create table public.fynlyax_ai_usage(user_id uuid primary key references auth.users(id) on delete cascade, window_start timestamptz not null, last_request timestamptz not null, requests integer not null);
alter table public.fynlyax_ai_usage enable row level security;
alter table public.fynlyax_ai_usage force row level security;
revoke all on public.fynlyax_ai_usage from anon,authenticated;
create function public.fynlyax_take_ai_slot() returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); accepted uuid;
begin
 if owner_id is null then raise exception 'authentication required' using errcode='42501';end if;
 insert into public.fynlyax_ai_usage as usage(user_id,window_start,last_request,requests) values(owner_id,now(),now(),1)
 on conflict(user_id) do update set window_start=case when usage.window_start<=now()-interval '1 hour' then now() else usage.window_start end,last_request=now(),requests=case when usage.window_start<=now()-interval '1 hour' then 1 else usage.requests+1 end
 where usage.last_request<=now()-interval '10 seconds' and (usage.window_start<=now()-interval '1 hour' or usage.requests<20)
 returning user_id into accepted;
 return accepted is not null;
end$$;
revoke all on function public.fynlyax_take_ai_slot() from public,anon;
grant execute on function public.fynlyax_take_ai_slot() to authenticated;
commit;
