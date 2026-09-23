import Link from "next/link";
import { ResumeEditor } from "@/components/applications/resume-editor";
import { demoJobs, demoResume } from "@/modules/demo/fixtures";
import { createMasterDocument } from "@/modules/profile/json-resume";
import { fromProfile } from "@/modules/template/from-profile";
export default function DemoPage() {
  const profile = createMasterDocument(demoResume, "tr-TR", "verified");
  const selectedClaimIds = Object.keys(profile.registry);
  return (
    <main className="p-4 md:p-8">
      <div className="mb-6 rounded border p-4">
        <p>
          Bu profil ve şirketler tamamen kurgusaldır. Buradaki değişiklikler
          kaydedilmez.
        </p>
        <Link href="/profile" className="underline">
          Kaydetmek ve PDF indirmek için giriş yapıp kaynak profilde “Örnek
          verilerle başla” seçin.
        </Link>
      </div>
      <ResumeEditor
        title={demoJobs[0].jobTitle}
        company={demoJobs[0].companyName}
        jobDescription={demoJobs[0].jobDescription}
        profile={profile}
        initialRevision={0}
        initialDocument={{
          schemaVersion: "1.0",
          templateId: "mehmet-yalaz-v1",
          origin: "user",
          selectedClaimIds,
          pageLimit: 2,
          display: {
            showLocation: true,
            locationLabel: "Şehir",
            showGithub: true,
            showLinkedin: true,
            showReferences: true,
          },
          cv: fromProfile(profile, selectedClaimIds),
        }}
      />
    </main>
  );
}
