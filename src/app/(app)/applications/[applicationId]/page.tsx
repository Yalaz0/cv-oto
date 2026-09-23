import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ResumeEditor } from "@/components/applications/resume-editor";
import { createClient } from "@/lib/supabase/server";
import { manualDocumentSchema } from "@/modules/editor/document";
import { masterResumeSchema } from "@/modules/profile/schema";
import { fromProfile } from "@/modules/template/from-profile";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const client = await createClient();
  const { data: application, error } = await client
    .from("applications")
    .select(
      "id,company_name,job_title,job_description,document_locale,master_resume_version_id",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error("Başvuru bağlantısı kurulamadı.");
  if (!application) notFound();
  const [source, saved] = await Promise.all([
    client
      .from("master_resume_versions")
      .select("document")
      .eq("id", application.master_resume_version_id)
      .single(),
    client
      .from("tailored_resumes")
      .select("id,document,current_revision")
      .eq("application_id", applicationId)
      .maybeSingle(),
  ]);
  if (source.error || saved.error) throw new Error("CV verileri yüklenemedi.");
  const profile = masterResumeSchema.parse(source.data.document);
  const selectedClaimIds = Object.values(profile.registry)
    .filter((claim) => claim.status === "verified")
    .map((claim) => claim.id);
  const initial = saved.data
    ? manualDocumentSchema.parse(saved.data.document)
    : manualDocumentSchema.parse({
        schemaVersion: "1.0",
        templateId: "mehmet-yalaz-v1",
        origin: "user",
        selectedClaimIds,
        pageLimit: 2,
        cv: fromProfile(profile, selectedClaimIds, application.document_locale),
      });
  return (
    <AppShell>
      <ResumeEditor
        applicationId={applicationId}
        title={application.job_title || "Başvuru"}
        company={application.company_name || ""}
        jobDescription={application.job_description}
        profile={profile}
        initialDocument={initial}
        initialRevision={saved.data?.current_revision ?? 0}
        initialResumeId={saved.data?.id}
      />
    </AppShell>
  );
}
