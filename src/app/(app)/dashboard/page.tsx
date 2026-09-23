import {
  ArrowRight,
  FileCheck2,
  FolderOpen,
  KeyRound,
  ListChecks,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const steps = [
  {
    number: "01",
    icon: UserRound,
    title: "Deneyimlerinizi bir araya getirin",
    description:
      "Eğitim, deneyim ve projelerinizi ana profilinize ekleyin. Kullanılacak bilgileri siz doğrulayın.",
  },
  {
    number: "02",
    icon: KeyRound,
    title: "İlanı ekleyip kaynaklarınızı seçin",
    description:
      "Gemini anahtarı gerekmez. Doğruladığınız bilgilerden başlayıp CV’nizi düzenleyin.",
  },
  {
    number: "03",
    icon: FileCheck2,
    title: "Her başvuruya özel bir CV hazırlayın",
    description:
      "İlanı ekleyin, ilgili deneyimlerinizi seçin ve metni gözden geçirerek PDF olarak indirin.",
  },
];

export default async function Dashboard() {
  const client = await createClient();
  const [profile, applications] = await Promise.all([
    client
      .from("master_resumes")
      .select("document")
      .eq("is_active", true)
      .maybeSingle(),
    client
      .from("applications")
      .select("id")
      .is("archived_at", null)
      .neq("status", "exported")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);
  const ready = Object.values(profile.data?.document?.registry ?? {}).some(
    (claim) => {
      const record = claim as { section?: string; status?: string };
      return record.section === "basics" && record.status === "verified";
    },
  );
  const next = ready
    ? applications.data?.[0]
      ? {
          href: `/applications/${applications.data[0].id}`,
          label: "Başvuruna devam et",
        }
      : { href: "/applications/new", label: "Yeni başvuru oluştur" }
    : { href: "/profile", label: "Profilini tamamla" };
  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Kariyerinizin bir sonraki adımı
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Genel bakış</h1>
        </div>
        <Badge variant="secondary">Başlangıç rehberi</Badge>
      </div>
      <section
        className="relative overflow-hidden rounded-xl border bg-primary px-6 py-8 text-primary-foreground md:px-10 md:py-12"
        aria-labelledby="welcome-title"
      >
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            CV TAILOR’A HOŞ GELDİNİZ
          </p>
          <h2
            id="welcome-title"
            className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl"
          >
            Deneyiminiz aynı.
            <br />
            Anlatımınız başvurunuza özel.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-blue-100 md:text-base">
            Doğruladığınız bilgileri bir araya getirin. İş ilanına uygun
            ifadeleri inceleyin, tasarımınızı koruyarak CV’nizi hazırlayın.
          </p>
          <Button asChild variant="secondary" className="mt-7 h-11">
            <Link href={next.href}>
              {next.label} <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <p className="mt-4 text-sm">
            <Link href="/demo" className="underline">
              Örnek CV ve başvuru akışını incele
            </Link>
          </p>
        </div>
      </section>
      <section className="mt-10" aria-labelledby="steps-title">
        <div className="mb-5 flex items-center gap-2">
          <ListChecks className="size-5 text-primary" />
          <h2 id="steps-title" className="text-lg font-semibold">
            Üç adımda başlayın
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <Card key={number} className="shadow-none">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {number}
                  </span>
                </div>
                <h3 className="text-base font-semibold leading-6">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section
        className="mt-10 rounded-xl border border-dashed px-6 py-10 text-center"
        aria-labelledby="applications-title"
      >
        <FolderOpen className="mx-auto mb-4 size-8 text-muted-foreground" />
        <h2 id="applications-title" className="text-lg font-semibold">
          Başvurularınız tek bir yerde
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Hazırladığınız CV’leri başvuru geçmişinizden açın ve kaydedilmiş
          sürümler üzerinden çalışmaya devam edin.
        </p>
        <Button asChild variant="outline" className="mt-5 h-11">
          <Link href="/applications">
            Başvurulara git <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </AppShell>
  );
}
