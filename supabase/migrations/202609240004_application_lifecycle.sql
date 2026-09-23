create function public.archive_application(p_id uuid,p_archived boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
 update public.applications set archived_at=case when p_archived then now() else null end where id=p_id and user_id=auth.uid();
 if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
end; $$;
create function public.duplicate_application(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_source public.applications; v_id uuid;
begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
 select * into v_source from public.applications where id=p_id and user_id=auth.uid();
 if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
 insert into public.applications(user_id,company_name,job_title,source_url,notes,job_description,job_description_hash,detected_locale,document_locale,locale_preference,strictness,master_resume_version_id,status)
 values(v_source.user_id,v_source.company_name,v_source.job_title,v_source.source_url,v_source.notes,v_source.job_description,v_source.job_description_hash,v_source.detected_locale,v_source.document_locale,v_source.locale_preference,v_source.strictness,v_source.master_resume_version_id,'draft') returning id into v_id;
 return v_id;
end; $$;
create function public.delete_application(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
 delete from public.applications where id=p_id and user_id=auth.uid();
 if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
end; $$;
revoke all on function public.archive_application(uuid,boolean),public.duplicate_application(uuid),public.delete_application(uuid) from public,anon;
grant execute on function public.archive_application(uuid,boolean),public.duplicate_application(uuid),public.delete_application(uuid) to authenticated;
