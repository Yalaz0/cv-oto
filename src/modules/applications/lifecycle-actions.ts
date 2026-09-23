"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { parsePublicEnv } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

async function permitted() {
  return isAllowedOrigin(
    (await headers()).get("origin"),
    parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL,
    process.env.NODE_ENV === "development",
  );
}
async function call(
  name: "archive_application" | "duplicate_application" | "delete_application",
  id: string,
  archived?: boolean,
) {
  if (!(await permitted())) return { error: "Geçersiz uygulama adresi." };
  if (!z.string().uuid().safeParse(id).success)
    return { error: "Başvuru bulunamadı." };
  const client = await createClient();
  const { data, error } = await client.rpc(
    name,
    name === "archive_application"
      ? { p_id: id, p_archived: archived }
      : { p_id: id },
  );
  if (error) return { error: "Başvuru işlemi tamamlanamadı." };
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { id: data as string | undefined };
}
export async function archiveApplication(id: string, archived: boolean) {
  return call("archive_application", id, archived);
}
export async function duplicateApplication(id: string) {
  return call("duplicate_application", id);
}
export async function deleteApplication(id: string) {
  return call("delete_application", id);
}
