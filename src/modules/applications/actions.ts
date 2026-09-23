"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { parsePublicEnv } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  companyName: z.string().max(200),
  jobTitle: z.string().max(200),
  jobDescription: z.string().min(200).max(20000),
  locale: z.enum(["tr-TR", "en-US"]),
  requestId: z.string().uuid(),
});
export async function createApplication(input: unknown) {
  if (
    !isAllowedOrigin(
      (await headers()).get("origin"),
      parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV === "development",
    )
  )
    return {
      error:
        "Uygulama adresi uyuşmuyor. Uygulamayı başlangıç bağlantısından açın.",
    };
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { error: "İlan metni 200 ile 20.000 karakter arasında olmalı." };
  const client = await createClient();
  const { data, error } = await client.rpc("create_application", {
    p_company_name: parsed.data.companyName,
    p_job_title: parsed.data.jobTitle,
    p_job_description: parsed.data.jobDescription,
    p_document_locale: parsed.data.locale,
    p_request_id: parsed.data.requestId,
  });
  if (error)
    return {
      error:
        error.message === "PROFILE_REQUIRED" ||
        error.message === "VERIFIED_PROFILE_REQUIRED"
          ? "Önce doğrulanmış bir profil sürümü oluşturun."
          : error.code === "PT401"
            ? "Oturumunuz sona erdi. Yeniden giriş yapın."
            : "Başvuru kaydedilemedi. Bağlantıyı kontrol ederek tekrar deneyin; formunuz korunuyor.",
    };
  return { id: data as string };
}
