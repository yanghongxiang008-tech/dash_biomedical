-- DEMO SHARE: share research data from a single owner to all users (revert later).
-- Revert by restoring original policies and dropping shared_research_owner_id().

create or replace function public.shared_research_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where email = 'zezhou.t@foxmail.com' limit 1;
$$;

grant execute on function public.shared_research_owner_id() to anon, authenticated;

-- research_sources policies
 drop policy if exists "Users can view own sources" on public.research_sources;
 drop policy if exists "Users can insert own sources" on public.research_sources;
 drop policy if exists "Users can update own sources" on public.research_sources;
 drop policy if exists "Users can delete own sources" on public.research_sources;

create policy "Demo shared sources view" on public.research_sources
for select
using (user_id = public.shared_research_owner_id());

create policy "Demo shared sources insert" on public.research_sources
for insert
with check (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
);

create policy "Demo shared sources update" on public.research_sources
for update
using (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
)
with check (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
);

create policy "Demo shared sources delete" on public.research_sources
for delete
using (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
);

-- research_items policies
 drop policy if exists "Users can view items from own sources" on public.research_items;
 drop policy if exists "Users can insert items to own sources" on public.research_items;
 drop policy if exists "Users can update items from own sources" on public.research_items;
 drop policy if exists "Users can delete items from own sources" on public.research_items;

create policy "Demo shared items view" on public.research_items
for select
using (
  exists (
    select 1
    from public.research_sources
    where research_sources.id = research_items.source_id
      and research_sources.user_id = public.shared_research_owner_id()
  )
);

create policy "Demo shared items insert" on public.research_items
for insert
with check (
  auth.uid() = public.shared_research_owner_id()
  and exists (
    select 1
    from public.research_sources
    where research_sources.id = research_items.source_id
      and research_sources.user_id = public.shared_research_owner_id()
  )
);

create policy "Demo shared items update" on public.research_items
for update
using (
  auth.uid() = public.shared_research_owner_id()
  and exists (
    select 1
    from public.research_sources
    where research_sources.id = research_items.source_id
      and research_sources.user_id = public.shared_research_owner_id()
  )
)
with check (
  auth.uid() = public.shared_research_owner_id()
  and exists (
    select 1
    from public.research_sources
    where research_sources.id = research_items.source_id
      and research_sources.user_id = public.shared_research_owner_id()
  )
);

create policy "Demo shared items delete" on public.research_items
for delete
using (
  auth.uid() = public.shared_research_owner_id()
  and exists (
    select 1
    from public.research_sources
    where research_sources.id = research_items.source_id
      and research_sources.user_id = public.shared_research_owner_id()
  )
);

-- research_summary_history policies
 drop policy if exists "Users can view their summary history" on public.research_summary_history;
 drop policy if exists "Users can insert their summary history" on public.research_summary_history;
 drop policy if exists "Users can update their summary history" on public.research_summary_history;
 drop policy if exists "Users can delete their summary history" on public.research_summary_history;

create policy "Demo shared summary history view" on public.research_summary_history
for select
using (user_id = public.shared_research_owner_id());

create policy "Demo shared summary history insert" on public.research_summary_history
for insert
with check (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
);

create policy "Demo shared summary history update" on public.research_summary_history
for update
using (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
)
with check (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
);

create policy "Demo shared summary history delete" on public.research_summary_history
for delete
using (
  auth.uid() = public.shared_research_owner_id()
  and user_id = public.shared_research_owner_id()
);
