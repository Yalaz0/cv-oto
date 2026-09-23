"use client";

import {
  ArrowDown,
  ArrowUp,
  Download,
  FilePlus2,
  FileUp,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getJsonResumeExport,
  importJsonResume,
  restoreProfileVersion,
  saveProfile,
  uploadProfilePhoto,
} from "@/modules/profile/actions";
import { createMasterDocument } from "@/modules/profile/json-resume";
import type { MasterResumeDocument } from "@/modules/profile/schema";

type Props = {
  initialDocument: MasterResumeDocument | null;
  initialId: string | null;
  initialVersion: number;
  history: {
    id: string;
    version: number;
    createdAt: string;
    changeSource: string;
  }[];
};
const sections = [
  ["work", "Deneyim"],
  ["education", "Eğitim"],
  ["projects", "Projeler"],
  ["skills", "Beceriler"],
  ["languages", "Diller"],
  ["references", "Referanslar"],
] as const;
const starter = () =>
  createMasterDocument(
    { basics: { name: "", label: "", email: "", summary: "" } },
    "tr-TR",
  );

function download(value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "cv-tailor-master-resume.json",
  });
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ProfileEditor({
  initialDocument,
  initialId,
  initialVersion,
  history,
}: Props) {
  const [document, setDocument] = useState(initialDocument ?? starter);
  const [id, setId] = useState(initialId ?? crypto.randomUUID());
  const [version, setVersion] = useState(initialVersion);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const verified = useMemo(
    () =>
      Object.values(document.registry).filter(
        (claim) => claim.status === "verified",
      ).length,
    [document.registry],
  );
  const unreviewedSections = useMemo(
    () => [
      ...new Set(
        Object.values(document.registry)
          .filter((claim) => claim.status === "needs_review")
          .map((claim) => claim.section),
      ),
    ],
    [document.registry],
  );
  const updateBasics = (key: string, value: string) =>
    setDocument((current) => ({
      ...current,
      resume: {
        ...current.resume,
        basics: { ...current.resume.basics, [key]: value },
      },
    }));
  const _updateSection = (
    section: (typeof sections)[number][0],
    value: string,
  ) => {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error();
      setDocument((current) => ({
        ...current,
        resume: { ...current.resume, [section]: parsed },
      }));
    } catch {
      toast.error("Geçerli bir JSON dizisi girin.");
    }
  };
  const setStructuredSection = (
    section: (typeof sections)[number][0],
    items: Record<string, unknown>[],
  ) =>
    setDocument((current) => ({
      ...current,
      resume: { ...current.resume, [section]: items },
    }));
  const statusesBySection = () =>
    Object.values(document.registry).reduce<
      Partial<
        Record<
          (typeof sections)[number][0] | "basics" | "summary",
          "verified" | "needs_review" | "rejected"
        >
      >
    >((statuses, claim) => {
      if (claim.status === "verified") statuses[claim.section] = "verified";
      if (!(claim.section in statuses)) statuses[claim.section] = claim.status;
      return statuses;
    }, {});
  const verifySection = (section: keyof ReturnType<typeof statusesBySection>) =>
    setDocument((current) => ({
      ...current,
      registry: Object.fromEntries(
        Object.entries(current.registry).map(([id, claim]) => [
          id,
          claim.section === section
            ? { ...claim, status: "verified" as const }
            : claim,
        ]),
      ),
    }));
  const save = async () => {
    if (!document.resume.basics.name.trim()) {
      toast.error("Kaynak profil için ad soyad zorunludur.");
      return;
    }
    setSaving(true);
    const containsUnreviewedClaims = Object.values(document.registry).some(
      (claim) => claim.status === "needs_review",
    );
    const rebuilt = createMasterDocument(
      document.resume,
      document.locale,
      containsUnreviewedClaims ? "needs_review" : "verified",
      statusesBySection(),
    );
    setDocument(rebuilt);
    const result = await saveProfile({
      id,
      expectedVersion: version,
      document: rebuilt,
      changeSource: "manual",
    });
    setSaving(false);
    if (result.error) return toast.error(result.error);
    setVersion(result.version ?? version);
    setId(result.id ?? id);
    toast.success("Profil sürümü kaydedildi.");
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const result = await importJsonResume(await file.text(), document.locale);
    if (result.error || !result.document) return toast.error(result.error);
    setDocument(result.document as MasterResumeDocument);
    setId(result.id ?? crypto.randomUUID());
    setVersion(0);
    toast.success("İçe aktarılan bilgiler inceleme bekliyor.");
  };
  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.set("photo", file);
    const result = await uploadProfilePhoto(formData);
    setUploadingPhoto(false);
    if (result.error || !result.imageUrl) return toast.error(result.error);
    updateBasics("image", result.imageUrl);
    toast.success(
      "Fotoğraf hazır. Kalıcı olması için profil sürümünü kaydedin.",
    );
  };
  const restore = async (snapshotId: string) => {
    if (!window.confirm("Bu sürümden yeni bir profil sürümü oluşturulsun mu?"))
      return;
    const result = await restoreProfileVersion({
      id,
      expectedVersion: version,
      snapshotId,
    });
    if (result.error) return toast.error(result.error);
    toast.success("Sürüm geri yüklendi. Sayfa güncelleniyor.");
    window.location.reload();
  };
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">
            KAYNAK PROFİL
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ana profiliniz
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Yalnızca kaydedip doğruladığınız bilgiler CV üretiminde
            kullanılabilir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp /> JSON Resume içe aktar
          </Button>
          <Button
            variant="outline"
            onClick={async () => download(await getJsonResumeExport(document))}
          >
            <Download /> Dışa aktar
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save /> {saving ? "Kaydediliyor" : "Sürümü kaydet"}
          </Button>
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => onImport(event.target.files?.[0])}
          />
        </div>
      </header>
      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary" />
          <div>
            <p className="font-medium">{verified} doğrulanmış ifade</p>
            <p className="text-xs text-muted-foreground">
              AI için kullanılabilir
            </p>
          </div>
        </div>
        <div>
          <p className="font-medium">Sürüm {version || "taslak"}</p>
          <p className="text-xs text-muted-foreground">
            Kayıtlar değişmez geçmişe eklenir
          </p>
        </div>
        <div>
          <p className="font-medium">
            {Object.keys(document.registry).length - verified} inceleme bekliyor
          </p>
          <p className="text-xs text-muted-foreground">
            İçe aktarılan bilgi önce onay ister
          </p>
        </div>
      </section>
      <section className="grid gap-5 rounded-xl border bg-card p-5 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-wrap items-center gap-4 rounded-lg bg-muted/40 p-4">
          {document.resume.basics.image ? (
            <Image
              alt="Profil önizlemesi"
              className="size-16 rounded-full object-cover"
              height={64}
              src={document.resume.basics.image}
              width={64}
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
              Fotoğraf
            </div>
          )}
          <div>
            <Label htmlFor="profile-photo">Profil fotoğrafı</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG veya WebP; en fazla 5 MB. Sunucuda güvenle yeniden
              işlenir.
            </p>
            <Input
              className="mt-2 max-w-xs"
              disabled={uploadingPhoto}
              id="profile-photo"
              accept="image/jpeg,image/png,image/webp"
              type="file"
              onChange={(event) => onPhoto(event.target.files?.[0])}
            />
          </div>
        </div>
        <Field
          label="Ad soyad"
          value={document.resume.basics.name}
          onChange={(value) => updateBasics("name", value)}
        />
        <Field
          label="Unvan"
          value={document.resume.basics.label}
          onChange={(value) => updateBasics("label", value)}
        />
        <Field
          label="E-posta"
          type="email"
          value={document.resume.basics.email}
          onChange={(value) => updateBasics("email", value)}
        />
        <Field
          label="Telefon"
          value={document.resume.basics.phone}
          onChange={(value) => updateBasics("phone", value)}
        />
        <Field
          label="Web sitesi / LinkedIn"
          value={document.resume.basics.url}
          onChange={(value) => updateBasics("url", value)}
        />
        <Field
          label="Şehir"
          value={document.resume.basics.location.city}
          onChange={(value) =>
            setDocument((current) => ({
              ...current,
              resume: {
                ...current.resume,
                basics: {
                  ...current.resume.basics,
                  location: { ...current.resume.basics.location, city: value },
                },
              },
            }))
          }
        />
        <div className="md:col-span-2">
          <Label htmlFor="summary">Profesyonel özet</Label>
          <textarea
            id="summary"
            className="mt-2 min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={document.resume.basics.summary}
            onChange={(event) => updateBasics("summary", event.target.value)}
          />
        </div>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        {sections.map(([key, label]) => (
          <StructuredSection
            items={document.resume[key]}
            key={key}
            label={label}
            onChange={(items) => setStructuredSection(key, items)}
          />
        ))}
      </section>
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <p className="font-medium">İçe aktarılan kayıtları doğrula</p>
        <p className="mt-1 text-sm text-muted-foreground">
          İçe aktarılan ifadeleri kaynakla karşılaştırdıktan sonra doğrulayın.
        </p>
        {unreviewedSections.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {unreviewedSections.map((section) => (
              <Button
                key={section}
                onClick={() => verifySection(section)}
                type="button"
                variant="outline"
              >
                {section} bölümünü doğrula
              </Button>
            ))}
          </div>
        )}
        <Button
          className="mt-4"
          variant="outline"
          onClick={() =>
            setDocument((current) =>
              createMasterDocument(current.resume, current.locale, "verified"),
            )
          }
        >
          Tüm ifadeleri doğrula
        </Button>
      </section>
      {history.length > 0 && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Sürüm geçmişi</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {history.map((entry) => (
              <li className="flex items-center justify-between" key={entry.id}>
                <span>Sürüm {entry.version}</span>
                <Button
                  disabled={entry.version === version}
                  onClick={() => restore(entry.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Geri yükle
                </Button>
                <span className="text-muted-foreground">
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(entry.createdAt))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function StructuredSection({
  label,
  items,
  onChange,
}: {
  label: string;
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
}) {
  const titleOf = (item: Record<string, unknown>) =>
    typeof item.name === "string"
      ? item.name
      : typeof item.company === "string"
        ? item.company
        : typeof item.institution === "string"
          ? item.institution
          : typeof item.language === "string"
            ? item.language
            : typeof item.reference === "string"
              ? item.reference
              : "";
  const detailsOf = (item: Record<string, unknown>) =>
    typeof item.details === "string"
      ? item.details
      : Array.isArray(item.highlights)
        ? item.highlights
            .filter((value): value is string => typeof value === "string")
            .join("\n")
        : typeof item.summary === "string"
          ? item.summary
          : typeof item.fluency === "string"
            ? item.fluency
            : "";
  const update = (index: number, key: "name" | "details", value: string) =>
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const moved = next[index];
    const replacement = next[target];
    if (!moved || !replacement) return;
    next[index] = replacement;
    next[target] = moved;
    onChange(next);
  };
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ctrl + Yukarı/Aşağı ile sıralayın.
          </p>
        </div>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            onChange([
              ...items,
              { id: crypto.randomUUID(), name: "", details: "" },
            ])
          }
        >
          <FilePlus2 /> Ekle
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div
            className="rounded-lg border bg-background p-3"
            key={typeof item.id === "string" ? item.id : JSON.stringify(item)}
          >
            <div className="flex gap-2">
              <Input
                aria-label={`${label} kaydı ${index + 1} başlığı`}
                value={titleOf(item)}
                onChange={(event) => update(index, "name", event.target.value)}
                onKeyDown={(event) => {
                  if (event.ctrlKey && event.key === "ArrowUp") {
                    event.preventDefault();
                    move(index, -1);
                  }
                  if (event.ctrlKey && event.key === "ArrowDown") {
                    event.preventDefault();
                    move(index, 1);
                  }
                }}
                placeholder="Başlık"
              />
              <Button
                aria-label="Yukarı taşı"
                disabled={index === 0}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                aria-label="Aşağı taşı"
                disabled={index === items.length - 1}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                aria-label="Kaydı sil"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() =>
                  onChange(items.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 />
              </Button>
            </div>
            <textarea
              aria-label={`${label} kaydı ${index + 1} ayrıntısı`}
              className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Ayrıntılar"
              value={detailsOf(item)}
              onChange={(event) => update(index, "details", event.target.value)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLocaleLowerCase("tr-TR").replaceAll(" ", "-");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        className="mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
