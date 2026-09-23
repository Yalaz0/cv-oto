create function public.rename_master_resume(p_id uuid, p_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
  if char_length(btrim(p_name)) not between 1 and 150 then raise sqlstate 'PT400' using message='INVALID_NAME'; end if;
  update public.master_resumes set name=btrim(p_name) where id=p_id and user_id=auth.uid();
  if not found then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
end; $$;
revoke all on function public.rename_master_resume(uuid,text) from public,anon;
grant execute on function public.rename_master_resume(uuid,text) to authenticated;
