create function public.create_application(
  p_company_name text, p_job_title text, p_job_description text,
  p_document_locale text default 'tr-TR'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_application uuid; v_version uuid;
begin
  if v_owner is null then raise sqlstate 'PT401' using message = 'AUTH_REQUIRED'; end if;
  if char_length(p_job_description) not between 200 and 20000 then raise sqlstate 'PT400' using message = 'INVALID_JOB_DESCRIPTION'; end if;
  select v.id into v_version from public.master_resume_versions v join public.master_resumes r on r.id=v.master_resume_id
    where r.user_id=v_owner and r.is_active and v.version=r.current_version;
  if v_version is null then raise sqlstate 'PT400' using message = 'PROFILE_REQUIRED'; end if;
  insert into public.applications(user_id,company_name,job_title,job_description,job_description_hash,document_locale,master_resume_version_id)
  values(v_owner,nullif(btrim(p_company_name),''),nullif(btrim(p_job_title),''),p_job_description,encode(digest(p_job_description,'sha256'),'hex'),p_document_locale,v_version)
  returning id into v_application;
  return v_application;
end;
$$;
revoke all on function public.create_application(text,text,text,text) from public,anon;
grant execute on function public.create_application(text,text,text,text) to authenticated;
