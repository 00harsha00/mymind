create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  attachments jsonb default '[]',
  tokens_used integer default 0,
  cost_usd numeric(10,6) default 0,
  features_used jsonb default '{}',
  created_at timestamptz default now()
);

alter table messages enable row level security;
create policy "Users can manage own messages" on messages for all
  using (chat_id in (select id from chats where user_id = auth.uid()));
