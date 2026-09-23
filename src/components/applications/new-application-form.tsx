"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApplication } from "@/modules/applications/actions";

export function NewApplicationForm() {
  const [pending, setPending] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const submit = async () => {
    setPending(true);
    const result = await createApplication({
      companyName,
      jobTitle,
      jobDescription,
      locale: "tr-TR",
    });
    setPending(false);
    if (result?.error) toast.error(result.error);
  };
  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">Yeni başvuru</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        İlan metni yalnızca bu başvuru için saklanır; analiz başlatılmadan
        hiçbir AI sağlayıcısına gönderilmez.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
    </div>
  );
}
