"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";
import { z } from "zod";
import { parsePublicEnv } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { createMasterDocument, exportJsonResume } from "./json-resume";
import { recognizePdfWithOcr } from "./ocr.server";
import { extractPdfImport, type PdfImportResult } from "./pdf-import";
import { parseResumeText } from "./pdf-text";
import { masterResumeSchema, profileSaveSchema } from "./schema";

export type ProfileActionState = {
  error?: string;
  version?: number;
  id?: string;
};

async function requireSameOrigin() {
  const origin = (await headers()).get("origin");
  if (
    !isAllowedOrigin(
      origin,
      parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV === "development",
    )
  )
    throw new Error("INVALID_ORIGIN");
}

export async function saveProfile(input: unknown): Promise<ProfileActionState> {
  await requireSameOrigin();
  const parsed = profileSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "Profil bilgilerini kontrol edin." };
  const client = await createClient();
  const { data, error } = await client.rpc("save_master_resume", {
    p_id: parsed.data.id,
    p_expected_version: parsed.data.expectedVersion,
    p_document: parsed.data.document,
    p_change_source: parsed.data.changeSource,
  });
  if (error)
    return {
      error:
        error.code === "PT409"
          ? "Bu profil başka bir sekmede güncellendi. Sayfayı yenileyin."
          : "Profil kaydedilemedi.",
    };
  const saved = data as { id: string; version: number };
  revalidatePath("/profile");
  return { id: saved.id, version: saved.version };
}

export async function renameMasterResume(input: { id: string; name: string }) {
  await requireSameOrigin();
  const parsed = z
    .object({ id: z.string().uuid(), name: z.string().trim().min(1).max(150) })
    .safeParse(input);
  if (!parsed.success)
    return { error: "CV adı 1 ile 150 karakter arasında olmalıdır." };
  const client = await createClient();
  const { error } = await client.rpc("rename_master_resume", {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
  });
  if (error) return { error: "CV adı kaydedilemedi." };
  revalidatePath("/profile");
  return {};
}

export async function restoreProfileVersion(input: {
  id: string;
  expectedVersion: number;
  snapshotId: string;
}): Promise<ProfileActionState> {
  await requireSameOrigin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      expectedVersion: z.number().int().positive(),
      snapshotId: z.string().uuid(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Geri yüklenecek sürüm geçersiz." };
  const client = await createClient();
  const { data: snapshot, error: snapshotError } = await client
    .from("master_resume_versions")
    .select("document")
    .eq("id", parsed.data.snapshotId)
    .eq("master_resume_id", parsed.data.id)
    .maybeSingle();
  if (snapshotError || !snapshot) return { error: "Profil sürümü bulunamadı." };
  return saveProfile({
    id: parsed.data.id,
    expectedVersion: parsed.data.expectedVersion,
    document: snapshot.document,
    changeSource: "manual",
  });
}

export async function importJsonResume(
  json: string,
  locale: "tr-TR" | "en-US",
): Promise<ProfileActionState & { document?: unknown }> {
  await requireSameOrigin();
  try {
    const document = createMasterDocument(
      JSON.parse(json),
      locale,
      "needs_review",
    );
    return { id: randomUUID(), version: 0, document };
  } catch {
    return { error: "JSON Resume belgesi geçerli değil." };
  }
}

export async function importPdfResume(
  formData: FormData,
  locale: "tr-TR" | "en-US",
) {
  await requireSameOrigin();
  const file = formData.get("resume");
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Oturumunuz sona erdi." };
  if (
    !(file instanceof File) ||
    (file.type && file.type !== "application/pdf") ||
    file.size > 10 * 1024 * 1024
  )
    return { error: "En fazla 10 MB PDF seçin." };
  let parser: PDFParse | undefined;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString() !== "%PDF-")
      return { error: "Dosya geçerli bir PDF değil." };
    const importAssetId = randomUUID();
    const { error: initialUploadError } = await client.storage
      .from("resume-imports")
      .upload(`${user.id}/${importAssetId}.pdf`, bytes, {
        contentType: "application/pdf",
        upsert: false,
        cacheControl: "private, max-age=0",
      });
    if (initialUploadError)
      return { error: "PDF güvenli saklamaya alınamadı. Yeniden deneyin." };
    parser = new PDFParse({ data: bytes });
    const { text } = await parser.getText();
    let extracted: PdfImportResult;
    try {
      extracted = await extractPdfImport(text, () =>
        recognizePdfWithOcr(bytes),
      );
    } catch {
      return {
        error:
          "PDF tarandı ancak OCR metin üretemedi. Dosya korunuyor; aşağıdaki manuel incelemeyle devam edebilirsiniz.",
        manualFallback: true,
        id: randomUUID(),
        version: 0,
        document: createMasterDocument({}, locale, "needs_review"),
        extractedText: "",
        importAssetId,
      };
    }
    const assetId = importAssetId;
    const { error: uploadError } = await client.storage
      .from("resume-imports")
      .upload(`${user.id}/${assetId}.pdf`, bytes, {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "private, max-age=0",
      });
    if (uploadError)
      return { error: "PDF güvenli saklamaya alınamadı. Yeniden deneyin." };
    return {
      id: randomUUID(),
      version: 0,
      document: createMasterDocument(
        parseResumeText(extracted.text),
        locale,
        "needs_review",
      ),
      extractedText: extracted.text,
      importAssetId: assetId,
      method: extracted.method,
    };
  } catch {
    return {
      error: "PDF metni okunamadı. Taranmış PDF için manuel giriş kullanın.",
    };
  } finally {
    await parser?.destroy();
  }
}

export async function getJsonResumeExport(document: unknown) {
  await requireSameOrigin();
  return exportJsonResume(masterResumeSchema.parse(document));
}

export async function uploadProfilePhoto(formData: FormData): Promise<{
  error?: string;
  imageUrl?: string;
  assetId?: string;
}> {
  await requireSameOrigin();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) return { error: "Bir fotoğraf seçin." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type))
    return { error: "JPEG, PNG veya WebP formatında bir fotoğraf seçin." };
  if (photo.size > 5 * 1024 * 1024)
    return { error: "Fotoğraf en fazla 5 MB olabilir." };
  try {
    const output = await sharp(Buffer.from(await photo.arrayBuffer()), {
      limitInputPixels: 25_000_000,
    })
      .rotate()
      .resize(800, 800, { fit: "cover", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { error: "Oturumun süresi doldu." };
    const { error } = await client.storage
      .from("profile-photos")
      .upload(`${user.id}/profile.jpg`, output, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "private, max-age=3600",
      });
    if (error) return { error: "Fotoğraf kaydedilemedi." };
    return {
      imageUrl: "/api/profile/photo",
      assetId: `${user.id}/profile.jpg`,
    };
  } catch {
    return { error: "Fotoğraf dosyası işlenemedi." };
  }
}
