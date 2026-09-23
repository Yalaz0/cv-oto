"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parsePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  companyName: z.string().max(200),
  jobTitle: z.string().max(200),
  jobDescription: z.string().min(200).max(20000),
  locale: z.enum(["tr-TR", "en-US"]),
});
export async function createApplication(input: unknown) {
  if (
    (await headers()).get("origin") !==
    new URL(parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL).origin
  )
    throw new Error("INVALID_ORIGIN");
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { error: "İlan metni 200 ile 20.000 karakter arasında olmalı." };
  const client = await createClient();
  const { data, error } = await client.rpc("create_application", {
    p_company_name: parsed.data.companyName,
    p_job_title: parsed.data.jobTitle,
    p_job_description: parsed.data.jobDescription,
    p_document_locale: parsed.data.locale,
  });
  if (error)
    return {
      error:
        error.code === "PT400" || error.message === "PROFILE_REQUIRED"
          ? "Önce doğrulanmış bir profil sürümü oluşturun."
          : "Başvuru oluşturulamadı.",
    };
  redirect(`/applications/${data}`);
}
