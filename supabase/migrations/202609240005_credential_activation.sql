create function public.activate_ai_credential() returns void language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid(); v_payload jsonb;
begin
 if v_owner is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
 update private.single_use_tokens set consumed_at=now() where user_id=v_owner and purpose='ai_credential_pending' and consumed_at is null and expires_at>now() returning payload into v_payload;
 if v_payload is null then raise sqlstate 'PT400' using message='PENDING_CREDENTIAL_REQUIRED'; end if;
 insert into public.ai_credentials(user_id,provider,encrypted_key,iv,auth_tag,key_version,key_suffix,model_id,status,last_tested_at)
 values(v_owner,'google',v_payload->>'ciphertext',v_payload->>'iv',v_payload->>'authTag',(v_payload->>'keyVersion')::integer,v_payload->>'keySuffix',v_payload->>'modelId','active',now())
 on conflict(user_id,provider) do update set encrypted_key=excluded.encrypted_key,iv=excluded.iv,auth_tag=excluded.auth_tag,key_version=excluded.key_version,key_suffix=excluded.key_suffix,model_id=excluded.model_id,status='active',last_tested_at=now();
end; $$;
create function public.revoke_ai_credential() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
 delete from private.single_use_tokens where user_id=auth.uid() and purpose='ai_credential_pending';
 delete from public.ai_credentials where user_id=auth.uid() and provider='google';
end; $$;
revoke all on function public.activate_ai_credential(),public.revoke_ai_credential() from public,anon;
grant execute on function public.activate_ai_credential(),public.revoke_ai_credential() to authenticated;
