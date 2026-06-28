create table if not exists users (
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
  }'
);

alter table users enable row level security;
create policy "Users can view own data" on users for select using (auth.uid() = id);
create policy "Users can update own data" on users for update using (auth.uid() = id);
