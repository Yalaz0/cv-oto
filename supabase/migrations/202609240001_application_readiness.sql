alter table public.applications add column request_id uuid;
create unique index application_request_owner on public.applications(user_id, request_id);

create or replace function public.create_application(p_company_name text,p_job_title text,p_job_description text,p_document_locale text default 'tr-TR',p_request_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_application uuid; v_version uuid; v_document jsonb;
begin
 if v_owner is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
 if p_request_id is null then raise sqlstate 'PT400' using message='REQUEST_ID_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_owner::text || p_request_id::text, 0));
 select id into v_application from public.applications where user_id=v_owner and request_id=p_request_id;
 if found then return v_application; end if;
 if char_length(p_job_description) not between 200 and 20000 or p_document_locale not in ('tr-TR','en-US') then raise sqlstate 'PT400' using message='INVALID_JOB_DESCRIPTION'; end if;
 select v.id,v.document into v_version,v_document from public.master_resume_versions v join public.master_resumes r on r.id=v.master_resume_id where r.user_id=v_owner and r.is_active and v.version=r.current_version;
 if v_version is null then raise sqlstate 'PT400' using message='PROFILE_REQUIRED'; end if;
 if not exists(select 1 from jsonb_each(v_document->'registry') c where c.value->>'status'='verified' and c.value->>'section'='basics') then raise sqlstate 'PT400' using message='VERIFIED_PROFILE_REQUIRED'; end if;
 insert into public.applications(user_id,company_name,job_title,job_description,job_description_hash,document_locale,master_resume_version_id,request_id)
 values(v_owner,nullif(btrim(p_company_name),''),nullif(btrim(p_job_title),''),p_job_description,encode(extensions.digest(convert_to(p_job_description,'UTF8'),'sha256'),'hex'),p_document_locale,v_version,p_request_id) returning id into v_application;
 return v_application;
end; $$;
drop function public.create_application(text,text,text,text);
revoke all on function public.create_application(text,text,text,text,uuid) from public,anon;
grant execute on function public.create_application(text,text,text,text,uuid) to authenticated;
