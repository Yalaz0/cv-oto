-- Add descriptive CV names without changing any existing document snapshots.
alter table public.tailored_resumes
  add column if not exists name text not null default 'Untitled CV'
  check (char_length(name) between 1 and 180);

update public.tailored_resumes r
set name = case
  when nullif(btrim(a.company_name), '') is not null
   and nullif(btrim(a.job_title), '') is not null
    then left(a.company_name || ' - ' || a.job_title || ' CV', 180)
  else 'Untitled CV'
end
from public.applications a
where a.id = r.application_id and r.name = 'Untitled CV';

drop function if exists public.save_manual_cv(uuid, integer, jsonb);
create function public.save_manual_cv(p_application_id uuid,p_expected_revision integer,p_document jsonb,p_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid := auth.uid(); v_app public.applications; v_resume public.tailored_resumes; v_revision integer; v_id uuid; v_profile jsonb; v_source text; v_report jsonb := '{"mode":"manual","requiresUserReview":true}'::jsonb; v_name text;
begin
 if v_owner is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
 select * into v_app from public.applications where id=p_application_id and user_id=v_owner for update;
 if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
 if p_document->>'origin' is distinct from 'user' or p_document->>'schemaVersion' is distinct from '1.0' or p_document->>'templateId' is distinct from 'mehmet-yalaz-v1' or jsonb_typeof(p_document->'cv') is distinct from 'object' or jsonb_typeof(p_document->'selectedClaimIds') is distinct from 'array' or octet_length(p_document::text)>200000 then raise sqlstate 'PT400' using message='INVALID_DOCUMENT'; end if;
 select document into v_profile from public.master_resume_versions where id=v_app.master_resume_version_id and user_id=v_owner;
 for v_source in select jsonb_array_elements_text(p_document->'selectedClaimIds') loop
   if (v_profile->'registry'->v_source->>'status') is distinct from 'verified' then raise sqlstate 'PT400' using message='UNVERIFIED_SOURCE'; end if;
 end loop;
 select * into v_resume from public.tailored_resumes where application_id=p_application_id and user_id=v_owner;
 if found then
   if v_resume.current_revision<>p_expected_revision then raise sqlstate 'PT409' using message='REVISION_CONFLICT'; end if;
   v_id:=v_resume.id; v_revision:=v_resume.current_revision+1;
   update public.tailored_resumes set document=p_document,current_revision=v_revision,truth_report=v_report,layout_report=null where id=v_id and user_id=v_owner;
 else
   if p_expected_revision<>0 then raise sqlstate 'PT409' using message='REVISION_CONFLICT'; end if;
   v_revision:=1;
   v_name := nullif(btrim(coalesce(p_name, '')), '');
   if v_name is null then
     v_name := case when nullif(btrim(v_app.company_name), '') is not null and nullif(btrim(v_app.job_title), '') is not null then left(v_app.company_name || ' - ' || v_app.job_title || ' CV', 180) else 'Untitled CV' end;
   end if;
   insert into public.tailored_resumes(application_id,user_id,name,document,truth_report) values(p_application_id,v_owner,v_name,p_document,v_report) returning id into v_id;
 end if;
 insert into public.tailored_resume_revisions(tailored_resume_id,user_id,revision,document,truth_report,master_resume_version_id,change_source) values(v_id,v_owner,v_revision,p_document,v_report,v_app.master_resume_version_id,'manual');
 update public.applications set status='review_required' where id=p_application_id and user_id=v_owner;
 return jsonb_build_object('id',v_id,'revision',v_revision);
end; $$;
revoke all on function public.save_manual_cv(uuid,integer,jsonb,text) from public,anon;
grant execute on function public.save_manual_cv(uuid,integer,jsonb,text) to authenticated;

create function public.rename_tailored_resume(p_id uuid, p_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
  if char_length(btrim(p_name)) not between 1 and 180 then raise sqlstate 'PT400' using message='INVALID_NAME'; end if;
  update public.tailored_resumes set name=btrim(p_name) where id=p_id and user_id=auth.uid();
  if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
end; $$;
revoke all on function public.rename_tailored_resume(uuid,text) from public,anon;
grant execute on function public.rename_tailored_resume(uuid,text) to authenticated;

create function public.restore_tailored_resume_revision(p_id uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_resume public.tailored_resumes; v_source public.tailored_resume_revisions; v_next integer;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
  select * into v_resume from public.tailored_resumes where id=p_id and user_id=auth.uid() for update;
  if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
  select * into v_source from public.tailored_resume_revisions where tailored_resume_id=p_id and user_id=auth.uid() and revision=p_revision;
  if not found then raise sqlstate 'PT404' using message='REVISION_NOT_FOUND'; end if;
  v_next:=v_resume.current_revision+1;
  update public.tailored_resumes set document=v_source.document,truth_report=v_source.truth_report,current_revision=v_next,layout_report=null where id=p_id;
  insert into public.tailored_resume_revisions(tailored_resume_id,user_id,revision,document,truth_report,master_resume_version_id,model_id,ai_run_id,change_source)
  values(p_id,auth.uid(),v_next,v_source.document,v_source.truth_report,v_source.master_resume_version_id,v_source.model_id,v_source.ai_run_id,'restore');
  return jsonb_build_object('revision',v_next,'document',v_source.document);
end; $$;
revoke all on function public.restore_tailored_resume_revision(uuid,integer) from public,anon;
grant execute on function public.restore_tailored_resume_revision(uuid,integer) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('resume-imports','resume-imports',false,10485760,array['application/pdf']) on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];

create policy "profile photo owner insert" on storage.objects for insert to authenticated with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile photo owner update" on storage.objects for update to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile photo owner delete" on storage.objects for delete to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "resume import owner select" on storage.objects for select to authenticated using (bucket_id='resume-imports' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "resume import owner insert" on storage.objects for insert to authenticated with check (bucket_id='resume-imports' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "resume import owner delete" on storage.objects for delete to authenticated using (bucket_id='resume-imports' and (storage.foldername(name))[1]=auth.uid()::text);
