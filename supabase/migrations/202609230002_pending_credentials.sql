create function public.stage_ai_credential(
  p_ciphertext text, p_iv text, p_auth_tag text, p_key_version integer,
  p_key_suffix text, p_model_id text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null then raise sqlstate 'PT401' using message = 'AUTH_REQUIRED'; end if;
  if char_length(p_key_suffix) <> 4 then raise sqlstate 'PT400' using message = 'INVALID_KEY'; end if;
  delete from private.single_use_tokens where user_id = v_owner and purpose = 'ai_credential_pending';
  insert into private.single_use_tokens(token_hash,user_id,purpose,payload,expires_at)
  values (encode(gen_random_bytes(32),'hex'),v_owner,'ai_credential_pending',jsonb_build_object(
    'ciphertext',p_ciphertext,'iv',p_iv,'authTag',p_auth_tag,'keyVersion',p_key_version,'keySuffix',p_key_suffix,'modelId',p_model_id
  ),now() + interval '10 minutes');
end;
$$;
revoke all on function public.stage_ai_credential(text,text,text,integer,text,text) from public,anon;
grant execute on function public.stage_ai_credential(text,text,text,integer,text,text) to authenticated;
