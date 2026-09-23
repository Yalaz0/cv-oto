"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApplication } from "@/modules/applications/actions";
import { demoJobs } from "@/modules/demo/fixtures";

export function NewApplicationForm() {
  const router = useRouter();
  const requestId = useRef("");
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<"tr-TR" | "en-US">("tr-TR");
  const [pending, setPending] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    requestId.current ||= crypto.randomUUID();
    setPending(true);
    setError("");
    try {
      const result = await createApplication({
        companyName,
        jobTitle,
        jobDescription,
        locale,
        requestId: requestId.current,
      });
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result.id) router.push(`/applications/${result.id}`);
    } catch {
      setError("Bağlantı kurulamadı. Bilgileriniz korunuyor; yeniden deneyin.");
    } finally {
      setPending(false);
      submitting.current = false;
    }
  };
  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">Yeni başvuru</h1>
      <div className="my-4 flex flex-wrap gap-2">
        {demoJobs.map((job) => (
          <Button
            key={job.companyName}
            variant="outline"
            onClick={() => {
              setCompanyName(job.companyName);
              setJobTitle(job.jobTitle);
              setJobDescription(job.jobDescription);
              setLocale(job.locale);
              requestId.current = "";
            }}
          >
            Örnek: {job.companyName}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        İlan metni yalnızca bu başvuru için saklanır; analiz başlatılmadan
        hiçbir AI sağlayıcısına gönderilmez.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="locale">CV dili</Label>
          <select
            id="locale"
            className="mt-2 block rounded border p-2"
            value={locale}
            onChange={(e) => setLocale(e.target.value as "tr-TR" | "en-US")}
          >
            <option value="tr-TR">Türkçe</option>
            <option value="en-US">English</option>
          </select>
        </div>
        <div>
          <Label htmlFor="company">Şirket</Label>
          <Input
            id="company"
            className="mt-2"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="title">Pozisyon</Label>
          <Input
            id="title"
            className="mt-2"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">İş ilanı</Label>
          <textarea
            id="description"
            className="mt-2 min-h-72 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {jobDescription.length.toLocaleString("tr-TR")} / 20.000 karakter ·
            En az 200 karakter
          </p>
        </div>
      </div>
      <Button
        className="mt-6"
        disabled={pending || jobDescription.length < 200}
        onClick={submit}
        type="button"
      >
        {pending ? "Oluşturuluyor" : "Başvuruyu oluştur"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}{" "}
          <a className="underline" href="/profile">
            Kaynak profili aç
          </a>
        </p>
      )}
    </div>
  );
}
