"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parsePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  type AuthState,
  authSchema,
  emailSchema,
  passwordSchema,
} from "./schemas";

async function ensureOrigin() {
  const origin = (await headers()).get("origin");
  const allowed = new URL(parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL)
    .origin;
  if (origin !== allowed) throw new Error("INVALID_ORIGIN");
}

export async function signIn(input: unknown): Promise<AuthState> {
  await ensureOrigin();
  const parsed = authSchema
    .pick({ email: true, password: true })
    .safeParse(input);
  if (!parsed.success) return { error: "E-posta ve parolanızı kontrol edin." };
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error)
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Giriş yapmadan önce e-postanızı doğrulayın."
          : "Giriş yapılamadı. E-posta ve parolanızı kontrol edin.",
    };
  redirect("/dashboard");
}

export async function signUp(input: unknown): Promise<AuthState> {
  await ensureOrigin();
  const parsed = authSchema.required({ displayName: true }).safeParse(input);
  if (!parsed.success)
    return { error: "Ad, e-posta ve parola alanlarını kontrol edin." };
  const client = await createClient();
  const { error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (error)
    return {
      error:
        "Hesap oluşturulamadı. Bilgilerinizi kontrol edip daha sonra yeniden deneyin.",
    };
  redirect("/verify");
}

export async function requestPasswordReset(input: unknown): Promise<AuthState> {
  await ensureOrigin();
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { error: "Geçerli bir e-posta adresi girin." };
  const client = await createClient();
  await client.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
  });
  return {
    success:
      "Bu adresle bir hesap varsa parola yenileme bağlantısı gönderildi.",
  };
}

export async function updatePassword(input: unknown): Promise<AuthState> {
  await ensureOrigin();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { error: "Parolanız 8–128 karakter olmalı." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return {
      error:
        "Bağlantının süresi dolmuş. Yeni bir parola yenileme bağlantısı isteyin.",
    };
  const { error } = await client.auth.updateUser({ password: parsed.data });
  if (error)
    return {
      error: "Parola güncellenemedi. Yeni bir bağlantıyla tekrar deneyin.",
    };
  await client.auth.signOut();
  redirect("/sign-in");
}

export async function signOut() {
  await ensureOrigin();
  const client = await createClient();
  await client.auth.signOut();
  redirect("/sign-in");
}
