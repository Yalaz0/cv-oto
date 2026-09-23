import { AppShell } from "@/components/app-shell";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { createClient } from "@/lib/supabase/server";
import { masterResumeSchema } from "@/modules/profile/schema";

export default async function ProfilePage() {
  const client = await createClient();
  const { data } = await client
    .from("master_resumes")
    .select("id,current_version,document")
    .eq("is_active", true)
    .maybeSingle();
  const document = data?.document
    ? masterResumeSchema.safeParse(data.document)
    : null;
  const { data: history } = data
    ? await client
        .from("master_resume_versions")
        .select("id,version,created_at,change_source")
        .eq("master_resume_id", data.id)
        .order("version", { ascending: false })
        .limit(20)
    : { data: [] };
  return (
    <AppShell>
      <ProfileEditor
        initialDocument={document?.success ? document.data : null}
        initialId={data?.id ?? null}
        initialVersion={data?.current_version ?? 0}
        history={(history ?? []).map((entry) => ({
          id: entry.id,
          version: entry.version,
          createdAt: entry.created_at,
          changeSource: entry.change_source,
        }))}
      />
    </AppShell>
  );
}
