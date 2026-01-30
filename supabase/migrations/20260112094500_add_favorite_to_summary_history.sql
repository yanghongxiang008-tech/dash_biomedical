alter table public.research_summary_history
add column if not exists is_favorite boolean not null default false;

create policy "Users can update their summary history"
on public.research_summary_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their summary history"
on public.research_summary_history
for delete
using (auth.uid() = user_id);
