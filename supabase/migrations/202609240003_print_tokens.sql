alter table public.export_events drop constraint export_events_page_count_check;
alter table public.export_events add constraint export_events_page_count_check check(page_count>0);

create function public.issue_print_token(p_resume_id uuid,p_revision integer,p_hash text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.tailored_resume_revisions where tailored_resume_id=p_resume_id and revision=p_revision and user_id=auth.uid()) then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
 delete from private.single_use_tokens where user_id=auth.uid() and expires_at<now();
 insert into private.single_use_tokens(token_hash,user_id,purpose,payload,expires_at) values(p_hash,auth.uid(),'print',jsonb_build_object('id',p_resume_id,'revision',p_revision),now()+interval '60 seconds');
end; $$;
create function public.consume_print_token(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_payload jsonb; v_document jsonb;
begin
 update private.single_use_tokens set consumed_at=now() where token_hash=p_hash and user_id=auth.uid() and purpose='print' and consumed_at is null and expires_at>now() returning payload into v_payload;
 if v_payload is null then raise sqlstate 'PT404' using message='NOT_FOUND'; end if;
 select document into v_document from public.tailored_resume_revisions where tailored_resume_id=(v_payload->>'id')::uuid and revision=(v_payload->>'revision')::integer and user_id=auth.uid();
 return v_document;
end; $$;
revoke all on function public.issue_print_token(uuid,integer,text),public.consume_print_token(text) from public,anon;
grant execute on function public.issue_print_token(uuid,integer,text),public.consume_print_token(text) to authenticated;
