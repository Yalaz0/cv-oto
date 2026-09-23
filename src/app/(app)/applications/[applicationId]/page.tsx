import { notFound } from "next/navigation";
import "@/components/template/cv-template.css";
import { AppShell } from "@/components/app-shell";
import { CvTemplate } from "@/components/template/cv-template";
import { createClient } from "@/lib/supabase/server";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const client = await createClient();
  const { data } = await client
    .from("applications")
    .select("company_name,job_title")
    .eq("id", applicationId)
    .maybeSingle();
  if (!data) notFound();
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">
          BAŞVURU TASLAĞI
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {data.job_title ?? "Pozisyon"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {data.company_name ?? "Şirket belirtilmedi"}
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[42%_58%]">
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">CV hazırlama durumu</h2>
            <ol className="mt-5 space-y-4 text-sm">
              <li>
                <strong>1. Profil</strong>
                <p className="text-muted-foreground">
                  Doğrulanmış kaynaklar kullanılacak.
                </p>
              </li>
              <li>
                <strong>2. İlan</strong>
                <p className="text-muted-foreground">
                  İlan kaydedildi; analiz başlatılmayı bekliyor.
                </p>
              </li>
              <li>
                <strong>3. Taslak CV</strong>
                <p className="text-muted-foreground">
                  Kaynak seçimi ve üretim tamamlandığında önizleme gerçek
                  içerikle güncellenecek.
                </p>
              </li>
            </ol>
          </section>
          <section className="overflow-hidden rounded-xl border bg-muted/40">
            <div className="border-b bg-card px-5 py-3">
              <h2 className="font-semibold">Canlı CV önizlemesi</h2>
              <p className="text-xs text-muted-foreground">
                Şablon görünümü · içerik oluşturulmayı bekliyor
              </p>
            </div>
            <div className="max-h-[72vh] overflow-auto">
              <div className="cv-canvas origin-top scale-[0.62] p-4">
                <CvTemplate
                  document={{
                    locale: "tr-TR",
                    basics: {
                      name: "Ad Soyad",
                      title: data.job_title ?? "Pozisyon",
                      email: "Profil tamamlandığında eklenecek",
                    },
                    summary:
                      "İlan analizi ve kaynak seçimi tamamlandığında doğrulanmış deneyimleriniz burada görünür.",
                    education: [],
                    work: [],
                    skills: [],
                    languages: [],
                    projects: [],
                    references: [],
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
