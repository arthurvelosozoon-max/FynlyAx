-- Independent, versioned storage for the current application state.
-- Does not read or change legacy tables. Never run 001 to enable this migration.
begin;
create function public.fynlyax_valid_cents(value jsonb, allow_zero boolean default true)
returns boolean language sql immutable set search_path='' as $$
 select case when jsonb_typeof(value)='number' then
 (value#>>'{}')::numeric between (case when allow_zero then 0 else 1 end) and 100000000000
 and trunc((value#>>'{}')::numeric)=(value#>>'{}')::numeric else false end
$$;

create function public.fynlyax_valid_state(payload jsonb)
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

create table public.fynlyax_user_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(public.fynlyax_valid_state(payload)),
 revision bigint not null default 1 check(revision between 1 and 9007199254740991),
 updated_at timestamptz not null default now()
);
alter table public.fynlyax_user_state enable row level security;
alter table public.fynlyax_user_state force row level security;
revoke all on public.fynlyax_user_state from anon,authenticated;
grant select on public.fynlyax_user_state to authenticated;
create policy fynlyax_read_own_state on public.fynlyax_user_state for select to authenticated
 using(user_id=(select auth.uid()));

-- Writes are allowed only through this RPC. auth.uid() supplies the owner;
-- callers cannot choose another user. Stale revisions fail atomically.
create function public.fynlyax_save_state(expected_revision bigint,next_payload jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); saved_revision bigint;
begin
 if owner_id is null then raise exception 'unauthorized' using errcode='42501';end if;
 if expected_revision is null or expected_revision<0 or expected_revision>=9007199254740991
 or not public.fynlyax_valid_state(next_payload) then raise exception 'invalid_payload' using errcode='22023';end if;
 if expected_revision=0 then
  insert into public.fynlyax_user_state(user_id,payload,revision) values(owner_id,next_payload,1)
  on conflict(user_id) do nothing returning revision into saved_revision;
 else
  update public.fynlyax_user_state set payload=next_payload,revision=revision+1,updated_at=now()
  where user_id=owner_id and revision=expected_revision returning revision into saved_revision;
 end if;
 if saved_revision is null then raise exception 'revision_conflict' using errcode='40001';end if;
 return saved_revision;
end$$;
revoke all on function public.fynlyax_save_state(bigint,jsonb) from public,anon;
grant execute on function public.fynlyax_save_state(bigint,jsonb) to authenticated;
revoke all on function public.fynlyax_valid_state(jsonb) from public,anon;
revoke all on function public.fynlyax_valid_cents(jsonb,boolean) from public,anon;
notify pgrst,'reload schema';
commit;
