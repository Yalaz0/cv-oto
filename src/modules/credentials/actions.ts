"use server";

import { headers } from "next/headers";
import { parsePublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { encryptCredential } from "./crypto.server";

export async function stageGoogleCredential(apiKey: string, modelId: string) {
  const origin = (await headers()).get("origin");
  if (
    origin !== new URL(parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL).origin
  )
    throw new Error("INVALID_ORIGIN");
  const key = apiKey.trim();
  if (key.length < 16 || key.length > 512)
    return { error: "Geçerli bir Gemini API anahtarı girin." };
  try {
    const env = getServerEnv();
    const allowedModels = env.GOOGLE_ALLOWED_MODELS.split(",").map((item) =>
      item.trim(),
    );
    if (!allowedModels.includes(modelId))
      return { error: "Bu model kullanıma açık değil." };
    const encrypted = encryptCredential(
      key,
      env.AI_CREDENTIAL_ENCRYPTION_KEY_V1,
      env.AI_CREDENTIAL_ACTIVE_KEY_VERSION,
    );
    const client = await createClient();
    const { error } = await client.rpc("stage_ai_credential", {
      p_ciphertext: encrypted.ciphertext,
      p_iv: encrypted.iv,
      p_auth_tag: encrypted.authTag,
      p_key_version: encrypted.keyVersion,
      p_key_suffix: key.slice(-4),
      p_model_id: modelId,
    });
    if (error) return { error: "Anahtar güvenli kayda alınamadı." };
    return { success: "Anahtar test onayı için güvenli olarak hazırlandı." };
  } catch {
    return { error: "AI bağlantısı bu ortamda henüz yapılandırılmadı." };
  }
}
