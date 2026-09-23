"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { parsePublicEnv } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { manualDocumentSchema } from "./document";

async function requireOrigin() {
  if (
    !isAllowedOrigin(
      (await headers()).get("origin"),
      parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV === "development",
    )
  )
    throw new Error("INVALID_ORIGIN");
}
export async function saveManualCv(input: unknown) {
  if (
    !isAllowedOrigin(
      (await headers()).get("origin"),
      parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV === "development",
    )
  )
    return { error: "Geçersiz uygulama adresi.", conflict: false };
  const parsed = z
    .object({
      applicationId: z.string().uuid(),
      expectedRevision: z.number().int().min(0),
      name: z.string().trim().min(1).max(180).optional(),
      document: manualDocumentSchema,
    })
    .safeParse(input);
  if (!parsed.success)
    return { error: "CV alanlarını kontrol edin.", conflict: false };
  const client = await createClient();
  const { data, error } = await client.rpc("save_manual_cv", {
    p_application_id: parsed.data.applicationId,
    p_expected_revision: parsed.data.expectedRevision,
    p_document: parsed.data.document,
    p_name: parsed.data.name,
  });
  if (error)
    return {
      error:
        error.code === "PT409"
          ? "Başka bir sekme bu CV’yi güncelledi. Metninizi kopyalayıp sayfayı yenileyin."
          : "CV kaydedilemedi. Bağlantıyı kontrol edip tekrar deneyin.",
      conflict: error.code === "PT409",
    };
  return { revision: Number(data.revision), id: String(data.id) };
}

export async function renameTailoredResume(input: {
  id: string;
  name: string;
}) {
  await requireOrigin();
  const parsed = z
    .object({ id: z.string().uuid(), name: z.string().trim().min(1).max(180) })
    .safeParse(input);
  if (!parsed.success)
    return { error: "CV adı 1 ile 180 karakter arasında olmalıdır." };
  const client = await createClient();
  const { error } = await client.rpc("rename_tailored_resume", {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
  });
  return error ? { error: "CV adı kaydedilemedi." } : {};
}

export async function restoreTailoredRevision(input: {
  id: string;
  revision: number;
}) {
  await requireOrigin();
  const parsed = z
    .object({ id: z.string().uuid(), revision: z.number().int().positive() })
    .safeParse(input);
  if (!parsed.success) return { error: "Geri yüklenecek sürüm geçersiz." };
  const client = await createClient();
  const { data, error } = await client.rpc("restore_tailored_resume_revision", {
    p_id: parsed.data.id,
    p_revision: parsed.data.revision,
  });
  if (error) return { error: "Sürüm geri yüklenemedi." };
  return { revision: Number(data.revision), document: data.document };
}
