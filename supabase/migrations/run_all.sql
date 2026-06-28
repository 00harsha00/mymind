-- MyMind — Run this entire file in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run

-- 1. Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users primary key,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  settings jsonb default '{
    "theme": "dark",
    "model": "claude-sonnet-4-6",
    "optimize_tokens": false,
    "features": {
      "web_search": false,
      "cite_sources": false,
      "memory": false,
      "follow_ups": false,
      "auto_detect_task": true,
      "code_reviewer": false,
      "agent_mode": false
    }
  }'::jsonb
);

alter table public.users enable row level security;
drop policy if exists "Users can view own data" on public.users;
drop policy if exists "Users can update own data" on public.users;
create policy "Users can view own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);
create policy "Users can insert own data" on public.users for insert with check (auth.uid() = id);

-- Auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Chats table
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  title text default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  total_tokens integer default 0,
  total_cost_usd numeric(10,6) default 0
);

alter table public.chats enable row level security;
drop policy if exists "Users can manage own chats" on public.chats;
create policy "Users can manage own chats" on public.chats for all using (auth.uid() = user_id);

-- 3. Messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  attachments jsonb default '[]',
  tokens_used integer default 0,
  cost_usd numeric(10,6) default 0,
  features_used jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
drop policy if exists "Users can manage own messages" on public.messages;
create policy "Users can manage own messages" on public.messages for all
  using (chat_id in (select id from public.chats where user_id = auth.uid()));

-- 4. Memory table
create table if not exists public.memory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  key text not null,
  value text not null,
  created_at timestamptz default now(),
  unique(user_id, key)
);

alter table public.memory enable row level security;
drop policy if exists "Users can manage own memory" on public.memory;
create policy "Users can manage own memory" on public.memory for all using (auth.uid() = user_id);

-- Done!
select 'MyMind tables created successfully ✓' as status;
