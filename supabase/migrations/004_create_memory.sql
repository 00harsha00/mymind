create table if not exists memory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  key text not null,
  value text not null,
  created_at timestamptz default now(),
  unique(user_id, key)
);

alter table memory enable row level security;
create policy "Users can manage own memory" on memory for all using (auth.uid() = user_id);
