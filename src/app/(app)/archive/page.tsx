import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { masterResumeSchema } from "@/modules/profile/schema";

const groups = [
  ["work", "Geçmiş deneyimler"],
  ["projects", "Projeler"],
  ["skills", "Beceriler"],
  ["references", "Referanslar"],
] as const;

export default async function ArchivePage() {
  const client = await createClient();
  const { data } = await client
    .from("master_resumes")
    .select("document")
    .eq("is_active", true)
    .maybeSingle();
  const profile = data?.document
    ? masterResumeSchema.safeParse(data.document)
    : null;
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">
            İÇERİK ARŞİVİ
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Tekrar kullanılabilir içerikler
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ana profilinizdeki doğrulanmış kaynaklar burada korunur. Başvuruya
            özel metinler orijinal kaydı değiştirmez.
          </p>
        </header>
        {!profile?.success ? (
          <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            Arşivi doldurmak için önce ana profile içerik ekleyin.
          </p>
        ) : (
          groups.map(([key, label]) => {
            const items = profile.data.resume[key];
            return (
              <section className="rounded-xl border bg-card p-5" key={key}>
                <h2 className="font-semibold">{label}</h2>
                <div className="mt-4 grid gap-3">
                  {items.length ? (
                    items.map((item) => {
                      const record = item as Record<string, unknown>;
                      const title = String(
                        record.company ??
                          record.name ??
                          record.reference ??
                          "Başlıksız kayıt",
                      );
                      const description = Array.isArray(record.highlights)
                        ? record.highlights
                            .filter(
                              (value): value is string =>
                                typeof value === "string",
                            )
                            .join(" · ")
                        : String(record.details ?? record.summary ?? "");
                      const claim = Object.values(profile.data.registry).find(
                        (entry) => entry.itemId === record.id,
                      );
                      return (
                        <article
                          className="rounded-lg border p-4"
                          key={String(record.id ?? title)}
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <h3 className="font-medium">{title}</h3>
                            <span className="text-xs text-muted-foreground">
                              {claim?.status === "verified"
                                ? "Doğrulandı"
                                : "İnceleme bekliyor"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {description || "Açıklama eklenmemiş."}
                          </p>
                          <p className="mt-3 text-xs text-muted-foreground">
                            Kaynak: {claim?.id ?? "Profil kaydı"} · Etiketler:{" "}
                            {claim?.tags.join(", ") || "Etiket yok"}
                          </p>
                        </article>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Bu bölümde kayıt yok.
                    </p>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
