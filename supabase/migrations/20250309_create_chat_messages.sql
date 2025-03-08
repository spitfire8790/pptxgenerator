-- Create pptxgen_chat_messages table if it doesn't exist
create table if not exists public.pptxgen_chat_messages (
    id uuid default gen_random_uuid() primary key,
    message text not null,
    user_name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.pptxgen_chat_messages enable row level security;

-- create policies
drop policy if exists "Anyone can view chat messages" on public.pptxgen_chat_messages;
create policy "Anyone can view chat messages" on public.pptxgen_chat_messages for select using (true);

drop policy if exists "Anyone can create chat messages" on public.pptxgen_chat_messages;
create policy "Anyone can create chat messages" on public.pptxgen_chat_messages for insert with check (true);

drop policy if exists "Users can update their own messages" on public.pptxgen_chat_messages;
create policy "Users can update their own messages" on public.pptxgen_chat_messages 
  for update using (user_name = current_setting('request.headers')::json->>'x-user-name');

drop policy if exists "Users can delete their own messages" on public.pptxgen_chat_messages;
create policy "Users can delete their own messages" on public.pptxgen_chat_messages 
  for delete using (user_name = current_setting('request.headers')::json->>'x-user-name');

-- create index if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'pptxgen_chat_messages_created_at_idx') then
    create index pptxgen_chat_messages_created_at_idx on public.pptxgen_chat_messages (created_at);
  end if;
end
$$;
