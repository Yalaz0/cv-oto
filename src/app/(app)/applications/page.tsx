import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function ApplicationsPage() {
  const client = await createClient();
  const { data } = await client
    .from("applications")
    .select("id,company_name,job_title,status,updated_at")
    .order("updated_at", { ascending: false });
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Başvurular</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              İlanları ve hazırlık durumlarını burada takip edin.
            </p>
          </div>
          <Button asChild>
            <Link href="/applications/new">Yeni başvuru</Link>
          </Button>
        </div>
        <div className="mt-8 space-y-3">
          {data?.length ? (
            data.map((item) => (
              <Link
                className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
                href={`/applications/${item.id}`}
                key={item.id}
              >
                <p className="font-medium">
                  {item.job_title ?? "Pozisyon belirtilmedi"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.company_name ?? "Şirket belirtilmedi"} · {item.status}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Henüz başvuru yok.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
