begin;
create or replace function public.fynlyax_valid_state(payload jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; payment jsonb; entry record; budget jsonb; base jsonb; cats text[]:=array['home','food','transport','health','leisure','salary','freelance','other']; ids text[]; card_ids text[]; seen text[];
begin
 if jsonb_typeof(payload) is distinct from 'object' or not payload ?& array['prefs','accounts','transactions','goals','limits'] or octet_length(payload::text)>2000000 then return false;end if;
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


commit;
