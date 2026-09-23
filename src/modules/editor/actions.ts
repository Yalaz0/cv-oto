"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { parsePublicEnv } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { manualDocumentSchema } from "./document";
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
