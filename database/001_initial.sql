-- Initial personal-finance schema for Supabase PostgreSQL.
-- Apply to a new development project; never executed automatically by the demo.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null default '', last_name text not null default '',
 locale text not null default 'pt-BR' check(locale in ('pt-BR','en-US','es-ES')),
 currency text not null default 'BRL' check(currency in ('BRL','USD','EUR','GBP')),
 timezone text not null default 'America/Fortaleza',
 theme text not null default 'dark' check(theme in ('dark','light','system')),
 preferences jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100), currency text not null check(currency in ('BRL','USD','EUR','GBP')),
 opening_cents bigint not null default 0, created_at timestamptz not null default now(), unique(id,user_id),unique(id,user_id,currency)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, color text not null default '#7C3AED', parent_id uuid,
 unique(id,user_id), foreign key(parent_id,user_id) references public.categories(id,user_id)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null, destination_id uuid, category_id uuid,
 currency text not null, type text not null check(type in ('income','expense','transfer')),
 description text not null check(length(trim(description)) between 1 and 500), amount_cents bigint not null check(amount_cents>0),
 transaction_date date not null, status text not null check(status in ('paid','pending')),
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(account_id,user_id,currency) references public.accounts(id,user_id,currency),
 foreign key(destination_id,user_id,currency) references public.accounts(id,user_id,currency),
 foreign key(category_id,user_id) references public.categories(id,user_id),
 check((type='transfer' and destination_id is not null and destination_id<>account_id) or (type<>'transfer' and destination_id is null))
);
create index transactions_user_date on public.transactions(user_id,transaction_date desc);
create table public.budgets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 category_id uuid not null, period_start date not null, limit_cents bigint not null check(limit_cents>0),
 currency text not null default 'BRL', foreign key(category_id,user_id) references public.categories(id,user_id),unique(user_id,category_id,period_start,currency)
);
create table public.goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, target_cents bigint not null check(target_cents>0), current_cents bigint not null default 0 check(current_cents>=0),
 currency text not null default 'BRL', target_date date, created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profile_owner on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
do $$declare table_name text;begin
 foreach table_name in array array['accounts','categories','transactions','budgets','goals'] loop
 execute format('alter table public.%I enable row level security',table_name);
 execute format('create policy personal_owner on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',table_name);
 end loop;
end$$;
create function public.touch_transaction() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now(); return new; end$$;
create trigger transaction_updated before update on public.transactions for each row execute function public.touch_transaction();
commit;
