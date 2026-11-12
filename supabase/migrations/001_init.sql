-- Passaporte C2: single-user study state. Every table is scoped to auth.uid() through RLS.

create table public.kv (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.srs_card (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('interview', 'vocab', 'example', 'error')),
  source_ref text,
  front text not null,
  back text not null,
  step int not null default 0,
  due date not null default current_date,
  first_reviewed_day date,
  created_at timestamptz not null default now(),
  unique (user_id, kind, source_ref)
);

create table public.entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('study_log', 'error', 'conversation', 'submission', 'checkpoint')),
  day date not null default current_date,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table public.recording (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  context text not null,
  reference_text text,
  path text not null,
  mime text not null,
  duration_sec int,
  self_assessment jsonb,
  created_at timestamptz not null default now()
);

create index entry_user_kind_day on public.entry (user_id, kind, day);
create index srs_card_user_due on public.srs_card (user_id, due);
create index recording_user_context on public.recording (user_id, context);

alter table public.kv enable row level security;
alter table public.srs_card enable row level security;
alter table public.entry enable row level security;
alter table public.recording enable row level security;

create policy own_kv on public.kv for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_srs_card on public.srs_card for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_entry on public.entry for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_recording on public.recording for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Private bucket; files live under {user_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 10485760, array['audio/webm', 'audio/mp4', 'audio/ogg']);

create policy own_recordings_select on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy own_recordings_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy own_recordings_delete on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
