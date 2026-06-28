create table if not exists chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  title text default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  total_tokens integer default 0,
  total_cost_usd numeric(10,6) default 0
);

alter table chats enable row level security;
create policy "Users can manage own chats" on chats for all using (auth.uid() = user_id);
