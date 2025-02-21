create table if not exists public.user_status (
    user_id text primary key,
    email text not null,
    name text not null,
    status text not null check (status in ('online', 'offline', 'generating')),
    last_seen timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now()
);

-- Enable row level security
alter table public.user_status enable row level security;

-- Create policy to allow anyone to read user status
create policy "Anyone can read user status"
    on public.user_status
    for select
    to anon
    using (true);

-- Create policy to allow users to update their own status
create policy "Users can update their own status"
    on public.user_status
    for insert
    to anon
    with check (true);

create policy "Users can update their own status with upsert"
    on public.user_status
    for update
    to anon
    using (true);

-- Enable realtime
alter publication supabase_realtime add table public.user_status; 