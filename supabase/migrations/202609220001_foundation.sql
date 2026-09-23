-- Owner-scoped reads, immutable snapshots, and server-authoritative reports.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 150),
  default_locale text not null default 'tr-TR' check (default_locale in ('tr-TR','en-US')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.master_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Master Resume' check (char_length(name) between 1 and 150),
  current_version integer not null default 1 check (current_version > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object' and document->>'schemaVersion' = '1.0' and document ?& array['resume','registry','itemMetadata']),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id,user_id)
);
create unique index one_active_master on public.master_resumes(user_id) where is_active;

create table public.master_resume_versions (
  id uuid primary key default gen_random_uuid(),
  master_resume_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0), document jsonb not null check (jsonb_typeof(document) = 'object'),
  change_source text not null check (change_source in ('manual','import','migration')),
  created_at timestamptz not null default now(),
  foreign key (master_resume_id,user_id) references public.master_resumes(id,user_id) on delete cascade,
  unique (master_resume_id,version), unique(id,user_id)
);

create table public.ai_credentials (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'google'), encrypted_key text not null,
  iv text not null, auth_tag text not null, key_version integer not null check (key_version > 0),
  key_suffix text not null check (char_length(key_suffix) = 4), model_id text not null,
  status text not null check (status in ('active','invalid','revoked')),
  last_tested_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,provider)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  company_name text, job_title text, source_url text, notes text,
  job_description text not null check (char_length(job_description) between 200 and 20000),
  job_description_hash text not null check (job_description_hash ~ '^[a-f0-9]{64}$'),
  detected_locale text check (detected_locale in ('tr-TR','en-US','other')),
  document_locale text not null check (document_locale in ('tr-TR','en-US')),
  locale_preference text not null default 'match' check (locale_preference in ('match','tr-TR','en-US')),
  strictness text not null default 'conservative' check (strictness in ('conservative','balanced')),
  analysis jsonb,
  status text not null default 'draft' check (status in ('draft','analyzing','analyzed','generating','review_required','ready_to_export','exported','failed')),
  previous_stable_state text check (previous_stable_state in ('draft','analyzed','review_required','ready_to_export','exported')),
  master_resume_version_id uuid, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (master_resume_version_id,user_id) references public.master_resume_versions(id,user_id),
  unique (id,user_id)
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid, operation text not null check (operation in ('analyze','rank','tailor','verify','regenerate')),
  provider text not null default 'google', model_id text not null, prompt_version text not null,
  status text not null check (status in ('started','succeeded','failed')),
  duration_ms integer check (duration_ms >= 0), input_tokens integer check (input_tokens >= 0), output_tokens integer check (output_tokens >= 0),
  error_code text, input_hash text, output_hash text, created_at timestamptz not null default now(),
  foreign key (application_id,user_id) references public.applications(id,user_id) on delete cascade,
  unique(id,user_id)
);

create table public.tailored_resumes (
  id uuid primary key default gen_random_uuid(), application_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null default 'mehmet-yalaz-v1' check (template_id = 'mehmet-yalaz-v1'),
  current_revision integer not null default 1 check (current_revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object' and document->>'schemaVersion' = '1.0' and document->>'templateId' = 'mehmet-yalaz-v1'),
  truth_report jsonb not null, layout_report jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (application_id,user_id) references public.applications(id,user_id) on delete cascade,
  unique(application_id), unique(id,user_id)
);

create table public.tailored_resume_revisions (
  id uuid primary key default gen_random_uuid(), tailored_resume_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0), document jsonb not null, truth_report jsonb not null,
  master_resume_version_id uuid not null, model_id text, ai_run_id uuid,
  change_source text not null check (change_source in ('ai','manual','regeneration','restore')),
  created_at timestamptz not null default now(),
  foreign key (tailored_resume_id,user_id) references public.tailored_resumes(id,user_id) on delete cascade,
  foreign key (master_resume_version_id,user_id) references public.master_resume_versions(id,user_id),
  foreign key (ai_run_id,user_id) references public.ai_runs(id,user_id),
  unique(tailored_resume_id,revision), unique(tailored_resume_id,revision,user_id)
);

create table public.export_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  tailored_resume_id uuid not null, revision integer not null,
  page_count integer not null check (page_count = 2), file_hash text not null check (file_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (tailored_resume_id,revision,user_id) references public.tailored_resume_revisions(tailored_resume_id,revision,user_id) on delete cascade
);

do $$
declare t text;
begin
  foreach t in array array['user_profiles','master_resumes','master_resume_versions','ai_credentials','applications','ai_runs','tailored_resumes','tailored_resume_revisions','export_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    if t <> 'ai_credentials' then
      execute format('grant select on public.%I to authenticated', t);
      execute format('create policy owner_read on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    end if;
    execute format('create index on public.%I (user_id)', t);
  end loop;
  foreach t in array array['user_profiles','master_resumes','ai_credentials','applications','tailored_resumes'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
  end loop;
end;
$$;
grant update(display_name,default_locale) on public.user_profiles to authenticated;
create policy owner_update on public.user_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index application_history on public.applications(user_id,updated_at desc);
create index application_status on public.applications(user_id,status);
create index master_version_owner on public.master_resume_versions(master_resume_id,user_id);
create index revision_owner on public.tailored_resume_revisions(tailored_resume_id,user_id);

create function private.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles(user_id,display_name)
  values(new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),'Yeni kullanıcı'),150));
  return new;
end;
$$;
create trigger create_user_profile after insert on auth.users for each row execute function private.create_user_profile();

-- Restricted RPC is the only authenticated write path: snapshot and head update
-- succeed together, and a stale client can never overwrite a newer version.
create function public.save_master_resume(p_id uuid, p_expected_version integer, p_document jsonb, p_change_source text default 'manual')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_current integer; v_version integer; v_snapshot uuid;
begin
  if v_owner is null then raise sqlstate 'PT401' using message = 'AUTH_REQUIRED'; end if;
  if p_change_source not in ('manual','import') then raise sqlstate 'PT400' using message = 'INVALID_SOURCE'; end if;
  if p_expected_version < 0 then raise sqlstate 'PT400' using message = 'INVALID_VERSION'; end if;
  if p_expected_version = 0 then
    insert into public.master_resumes(id,user_id,document) values(p_id,v_owner,p_document);
    v_version := 1;
  else
    select current_version into v_current from public.master_resumes where id=p_id and user_id=v_owner for update;
    if not found then raise sqlstate 'PT404' using message = 'NOT_FOUND'; end if;
    if v_current <> p_expected_version then raise sqlstate 'PT409' using message = 'REVISION_CONFLICT', detail=v_current::text; end if;
    v_version := v_current + 1;
    update public.master_resumes set document=p_document,current_version=v_version where id=p_id and user_id=v_owner;
  end if;
  insert into public.master_resume_versions(master_resume_id,user_id,version,document,change_source)
  values(p_id,v_owner,v_version,p_document,p_change_source) returning id into v_snapshot;
  return jsonb_build_object('id',p_id,'version',v_version,'versionId',v_snapshot);
end;
$$;
revoke all on function public.save_master_resume(uuid,integer,jsonb,text) from public,anon;
grant execute on function public.save_master_resume(uuid,integer,jsonb,text) to authenticated;

-- Authoritative validation reports may only be written by the server, after
-- authenticating the caller and validating the full document.
create function public.save_tailored_revision(p_user_id uuid, p_id uuid, p_expected_revision integer, p_document jsonb, p_truth_report jsonb, p_master_version_id uuid, p_change_source text, p_model_id text default null, p_run_id uuid default null)
returns jsonb language plpgsql set search_path = '' as $$
declare v_current integer; v_revision integer;
begin
  select current_revision into v_current from public.tailored_resumes where id=p_id and user_id=p_user_id for update;
  if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
  if v_current <> p_expected_revision then raise sqlstate 'PT409' using message='REVISION_CONFLICT',detail=v_current::text; end if;
  v_revision := v_current+1;
  insert into public.tailored_resume_revisions(tailored_resume_id,user_id,revision,document,truth_report,master_resume_version_id,change_source,model_id,ai_run_id)
  values(p_id,p_user_id,v_revision,p_document,p_truth_report,p_master_version_id,p_change_source,p_model_id,p_run_id);
  update public.tailored_resumes set document=p_document,truth_report=p_truth_report,layout_report=null,current_revision=v_revision where id=p_id and user_id=p_user_id;
  return jsonb_build_object('id',p_id,'revision',v_revision);
end;
$$;
revoke all on function public.save_tailored_revision(uuid,uuid,integer,jsonb,jsonb,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.save_tailored_revision(uuid,uuid,integer,jsonb,jsonb,uuid,text,text,uuid) to service_role;

create function private.reject_snapshot_update() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'Snapshot is immutable'; end;
$$;
create trigger immutable_master before update on public.master_resume_versions for each row execute function private.reject_snapshot_update();
create trigger immutable_revision before update on public.tailored_resume_revisions for each row execute function private.reject_snapshot_update();

-- Private internal state. These tables are not exposed through the Data API.
create table private.operation_leases (
  operation_key text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null default gen_random_uuid(), expires_at timestamptz not null
);
create table private.single_use_tokens (
  token_hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null, payload jsonb not null, expires_at timestamptz not null, consumed_at timestamptz
);
create table private.rate_windows (
  bucket text not null, user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null, count integer not null default 0,
  primary key(bucket,user_id,window_start)
);
alter table private.operation_leases enable row level security;
alter table private.single_use_tokens enable row level security;
alter table private.rate_windows enable row level security;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy photo_owner_read on storage.objects for select to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Writes go through the server image re-encoding pipeline. No raw browser upload.
