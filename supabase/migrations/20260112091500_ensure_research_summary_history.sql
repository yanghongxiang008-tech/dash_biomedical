create table if not exists public.research_summary_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  title text,
  preview text,
  item_count integer not null default 0,
  source_count integer not null default 0,
  source_ids uuid[] null,
  priority_counts jsonb null,
  created_at timestamptz not null default now()
);

alter table public.research_summary_history enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'research_summary_history'
      and policyname = 'Users can view their summary history'
  ) then
    create policy "Users can view their summary history"
    on public.research_summary_history
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'research_summary_history'
      and policyname = 'Users can insert their summary history'
  ) then
    create policy "Users can insert their summary history"
    on public.research_summary_history
    for insert
    with check (auth.uid() = user_id);
  end if;
end $$;
