-- Create table for storing invitation editor state
create table if not exists invitation_state (
  id          text primary key,
  state       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Enable RLS
alter table invitation_state enable row level security;

-- Allow all operations with anon key (password gate is client-side)
create policy "Allow all with anon key"
  on invitation_state
  for all
  using (true)
  with check (true);
