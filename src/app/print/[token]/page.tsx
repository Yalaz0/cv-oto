import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { PaginatedCv } from "@/components/template/paginated-cv";
import { createClient } from "@/lib/supabase/server";
import { manualDocumentSchema } from "@/modules/editor/document";
import "@/components/template/cv-template.css";
export default async function PrintPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const client = await createClient();
  const { data, error } = await client.rpc("consume_print_token", {
    p_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (error || !data) notFound();
  const document = manualDocumentSchema.parse(data);
  return (
    <PaginatedCv document={document.cv} pageLimit={document.pageLimit} print />
  );
}
