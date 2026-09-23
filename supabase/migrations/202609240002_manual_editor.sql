create function public.save_manual_cv(p_application_id uuid,p_expected_revision integer,p_document jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid := auth.uid(); v_app public.applications; v_resume public.tailored_resumes; v_revision integer; v_id uuid; v_profile jsonb; v_source text; v_report jsonb := '{"mode":"manual","requiresUserReview":true}'::jsonb;
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
   insert into public.tailored_resumes(application_id,user_id,document,truth_report) values(p_application_id,v_owner,p_document,v_report) returning id into v_id;
 end if;
 insert into public.tailored_resume_revisions(tailored_resume_id,user_id,revision,document,truth_report,master_resume_version_id,change_source)
 values(v_id,v_owner,v_revision,p_document,v_report,v_app.master_resume_version_id,'manual');
 update public.applications set status='review_required' where id=p_application_id and user_id=v_owner;
 return jsonb_build_object('id',v_id,'revision',v_revision);
end; $$;
revoke all on function public.save_manual_cv(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_manual_cv(uuid,integer,jsonb) to authenticated;
