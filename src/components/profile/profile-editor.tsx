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
import { PaginatedCv } from "@/components/template/paginated-cv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import "@/components/template/cv-template.css";
import { demoResume } from "@/modules/demo/fixtures";
import {
  getJsonResumeExport,
  importJsonResume,
  importPdfResume,
  renameMasterResume,
  restoreProfileVersion,
  saveProfile,
  uploadProfilePhoto,
} from "@/modules/profile/actions";
import {
  createMasterDocument,
  reconcileMasterDocument,
} from "@/modules/profile/json-resume";
import type { MasterResumeDocument } from "@/modules/profile/schema";
import { fromMasterProfile } from "@/modules/template/from-profile";

type Props = {
  initialDocument: MasterResumeDocument | null;
  initialId: string | null;
  initialVersion: number;
  initialName: string;
  history: {
    id: string;
    version: number;
    createdAt: string;
    changeSource: string;
  }[];
};
const sections = [
  ["education", "Eğitim"],
  ["work", "Deneyim"],
  ["skills", "Beceriler"],
  ["projects", "Projeler"],
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
  initialName,
  history,
}: Props) {
  const [document, setRawDocument] = useState(initialDocument ?? starter);
  const setDocument = (
    update:
      | MasterResumeDocument
      | ((current: MasterResumeDocument) => MasterResumeDocument),
  ) =>
    setRawDocument((current) => {
      const next = typeof update === "function" ? update(current) : update;
      return reconcileMasterDocument(next, current);
    });
  const [id, setId] = useState(initialId ?? crypto.randomUUID());
  const [version, setVersion] = useState(initialVersion);
  const [name, setName] = useState(initialName);
  const [savedPayload, setSavedPayload] = useState(() =>
    JSON.stringify(initialDocument ?? starter()),
  );
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [zoom, setZoom] = useState<"fit" | 75 | 100 | 125>("fit");
  const [layout, setLayout] = useState({ pages: 0, overflow: false });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [importStage, setImportStage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const payload = JSON.stringify(document);
  const dirty = payload !== savedPayload;
  const preview = useMemo(() => fromMasterProfile(document), [document]);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(620);
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
  const displaySettings =
    (document.resume.meta?.cvDisplaySettings as
      | {
          showLocation?: boolean;
          locationLabel?: "Şehir" | "Ülke" | "City" | "Country";
          locationValue?: string;
          showGithub?: boolean;
          showLinkedin?: boolean;
          showReferences?: boolean;
        }
      | undefined) ?? {};
  const updateDisplaySetting = (key: string, value: string | boolean) =>
    setDocument((current) => ({
      ...current,
      resume: {
        ...current.resume,
        meta: {
          ...current.resume.meta,
          cvDisplaySettings: {
            ...(current.resume.meta?.cvDisplaySettings as
              | Record<string, unknown>
              | undefined),
            [key]: value,
          },
        },
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
    try {
      const result = await saveProfile({
        id,
        expectedVersion: version,
        document,
        changeSource: "manual",
      });
      setSaving(false);
      if (result.error) return toast.error(result.error);
      setVersion(result.version ?? version);
      setId(result.id ?? id);
      setSavedPayload(JSON.stringify(document));
      toast.success("Profil sürümü kaydedildi.");
    } catch {
      toast.error("Bağlantı kurulamadı. Değişiklikleriniz korunuyor.");
    } finally {
      setSaving(false);
    }
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setImportStage(
      file.name.toLowerCase().endsWith(".pdf")
        ? "PDF okunuyor"
        : "Çıkarılan veriler inceleniyor",
    );
    const ocrTimer = file.name.toLowerCase().endsWith(".pdf")
      ? window.setTimeout(() => setImportStage("OCR çalışıyor"), 500)
      : undefined;
    const data = new FormData();
    data.set("resume", file);
    const result = file.name.toLowerCase().endsWith(".pdf")
      ? await importPdfResume(data, document.locale)
      : await importJsonResume(await file.text(), document.locale);
    if (ocrTimer) window.clearTimeout(ocrTimer);
    if (!result.document)
      return toast.error(result.error ?? "Dosya içe aktarılamadı.");
    setImportStage("Çıkarılan veriler inceleniyor");
    if (
      !window.confirm(
        "İçe aktarılan bilgiler mevcut düzenleme alanına aktarılsın mı? Kaydedene kadar mevcut sürümünüz korunur.",
      )
    )
      return;
    setRawDocument(result.document as MasterResumeDocument);
    setExtractedText(
      "extractedText" in result ? String(result.extractedText ?? "") : "",
    );
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
    setRawDocument((current) => ({
      ...current,
      resume: {
        ...current.resume,
        basics: {
          ...current.resume.basics,
          image: result.imageUrl ?? "",
          photoAssetId: result.assetId ?? "",
        },
      },
    }));
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
  const rename = async () => {
    if (!id || !name.trim() || version === 0) return;
    const result = await renameMasterResume({ id, name });
    if (result.error) return toast.error(result.error);
    toast.success("CV adı kaydedildi.");
  };
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-16">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">
            KAYNAK PROFİL
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Yalnızca kaydedip doğruladığınız bilgiler CV üretiminde
            kullanılabilir.
          </p>
          <label className="mt-3 block max-w-md text-sm">
            CV adı
            <input
              className="mt-1 block w-full rounded border bg-background p-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => void rename()}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Ana etiket budur; sürüm numarası yalnızca ikincil bilgidir.
            </span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {version === 0 && !document.resume.basics.name && (
            <Button
              variant="outline"
              onClick={() =>
                setRawDocument(
                  createMasterDocument(demoResume, "tr-TR", "needs_review"),
                )
              }
            >
              Örnek verilerle başla
            </Button>
          )}
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp /> CV yükle (PDF / JSON)
          </Button>
          <Button
            variant="outline"
            onClick={async () => download(await getJsonResumeExport(document))}
          >
            <Download /> Dışa aktar
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save />{" "}
            {saving
              ? "Kaydediliyor"
              : dirty
                ? "Değişiklikleri kaydet"
                : "Kaydedildi"}
          </Button>
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept="application/json,application/pdf,.json,.pdf"
            onChange={(event) => onImport(event.target.files?.[0])}
          />
        </div>
      </header>
      <div className="flex gap-2 lg:hidden">
        <Button
          variant={tab === "edit" ? "default" : "outline"}
          onClick={() => setTab("edit")}
        >
          Düzenle
        </Button>
        <Button
          variant={tab === "preview" ? "default" : "outline"}
          onClick={() => setTab("preview")}
        >
          Önizle
        </Button>
      </div>
      <div
        className="grid items-start gap-6"
        style={{
          gridTemplateColumns: previewCollapsed
            ? "minmax(0, 1fr)"
            : `minmax(0, 1fr) minmax(420px, ${previewWidth}px)`,
        }}
      >
        <div
          className={`${tab === "edit" ? "block" : "hidden"} space-y-6 lg:block`}
        >
          {importStage && (
            <output className="rounded border p-3 text-sm">
              {importStage}
              {importStage === "Çıkarılan veriler inceleniyor"
                ? " · Alanları düzenleyin, ardından doğrulayıp profil sürümünü kaydedin."
                : "…"}
            </output>
          )}
          {extractedText && (
            <details className="rounded border p-4" open>
              <summary>
                PDF kaynak metni · alanları bu metinle karşılaştırın
              </summary>
              <p className="my-2 text-sm">
                Bölümler yaklaşık çıkarıldı. Birden fazla kayıt tek alanda
                olabilir; gerekli kayıtları ayırıp doğrulayın.
              </p>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-sm">
                {extractedText}
              </pre>
            </details>
          )}
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
                {Object.keys(document.registry).length - verified} inceleme
                bekliyor
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
                      location: {
                        ...current.resume.basics.location,
                        city: value,
                      },
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
                onChange={(event) =>
                  updateBasics("summary", event.target.value)
                }
              />
            </div>
          </section>
          <details className="rounded-xl border bg-card p-5">
            <summary className="cursor-pointer font-semibold">
              CV görüntü ayarları
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Bu seçenekler yalnızca isteğe bağlı satırların görünürlüğünü ve
              metnini değiştirir; şablon ölçüleri sabittir.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={displaySettings.showLocation !== false}
                  onChange={(event) =>
                    updateDisplaySetting("showLocation", event.target.checked)
                  }
                />{" "}
                Konumu göster
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={displaySettings.showLinkedin !== false}
                  onChange={(event) =>
                    updateDisplaySetting("showLinkedin", event.target.checked)
                  }
                />{" "}
                LinkedIn’i göster
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={displaySettings.showGithub !== false}
                  onChange={(event) =>
                    updateDisplaySetting("showGithub", event.target.checked)
                  }
                />{" "}
                GitHub’ı göster
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={displaySettings.showReferences !== false}
                  onChange={(event) =>
                    updateDisplaySetting("showReferences", event.target.checked)
                  }
                />{" "}
                Referansları göster
              </label>
              <label className="text-sm">
                Konum etiketi
                <select
                  className="ml-2 rounded border p-2"
                  value={displaySettings.locationLabel ?? "Şehir"}
                  onChange={(event) =>
                    updateDisplaySetting("locationLabel", event.target.value)
                  }
                >
                  <option>Şehir</option>
                  <option>Ülke</option>
                  <option>City</option>
                  <option>Country</option>
                </select>
              </label>
              <label className="text-sm">
                Gösterilecek konum
                <input
                  className="ml-2 rounded border p-2"
                  value={
                    displaySettings.locationValue ??
                    document.resume.basics.location.city
                  }
                  onChange={(event) =>
                    updateDisplaySetting("locationValue", event.target.value)
                  }
                />
              </label>
            </div>
          </details>
          <section className="grid gap-5 md:grid-cols-2">
            {sections.map(([key, label]) => (
              <StructuredSection
                section={key}
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
              İçe aktarılan ifadeleri kaynakla karşılaştırdıktan sonra
              doğrulayın.
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
                setRawDocument((current) => ({
                  ...current,
                  registry: Object.fromEntries(
                    Object.entries(current.registry).map(([key, claim]) => [
                      key,
                      { ...claim, status: "verified" as const },
                    ]),
                  ),
                  itemMetadata: Object.fromEntries(
                    Object.entries(current.itemMetadata).map(
                      ([key, metadata]) => [
                        key,
                        { ...metadata, status: "verified" as const },
                      ],
                    ),
                  ),
                }))
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
                  <li
                    className="flex items-center justify-between"
                    key={entry.id}
                  >
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
        {!previewCollapsed && (
          <ProfilePreview
            document={preview}
            zoom={zoom}
            onZoom={setZoom}
            layout={layout}
            onLayoutChange={setLayout}
            visible={tab === "preview"}
            onCollapse={() => setPreviewCollapsed(true)}
            onResize={(delta) =>
              setPreviewWidth((width) =>
                Math.max(420, Math.min(900, width + delta)),
              )
            }
          />
        )}
        {previewCollapsed && (
          <Button
            className="hidden lg:inline-flex"
            variant="outline"
            onClick={() => setPreviewCollapsed(false)}
          >
            Önizlemeyi aç
          </Button>
        )}
      </div>
    </div>
  );
}

function ProfilePreview({
  document,
  zoom,
  onZoom,
  layout,
  onLayoutChange,
  visible,
  onCollapse,
  onResize,
}: {
  document: ReturnType<typeof fromMasterProfile>;
  zoom: "fit" | 75 | 100 | 125;
  onZoom: (value: "fit" | 75 | 100 | 125) => void;
  layout: { pages: number; overflow: boolean };
  onLayoutChange: (value: { pages: number; overflow: boolean }) => void;
  visible: boolean;
  onCollapse: () => void;
  onResize: (delta: number) => void;
}) {
  return (
    <aside
      className={`${visible ? "block" : "hidden"} relative min-w-0 rounded-xl border bg-muted/40 lg:sticky lg:top-4 lg:block`}
    >
      <div className="border-b bg-card p-4">
        <h2 className="font-semibold">Canlı Master CV önizlemesi</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          İçerik değişiklikleri anında görünür. Şablon, sabit iki A4 sayfadır.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["fit", 75, 100, 125] as const).map((value) => (
            <Button
              key={String(value)}
              size="sm"
              type="button"
              variant={zoom === value ? "default" : "outline"}
              onClick={() => onZoom(value)}
            >
              {value === "fit" ? "Sığdır" : `%${value}`}
            </Button>
          ))}
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() =>
              globalThis.document
                .getElementById("master-cv-preview")
                ?.requestFullscreen?.()
            }
          >
            Önizlemeyi büyüt
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={onCollapse}
          >
            Daralt
          </Button>
        </div>
      </div>
      {(layout.overflow || layout.pages > 2) && (
        <p
          role="alert"
          className="m-3 rounded border border-destructive p-3 text-sm text-destructive"
        >
          İçerik sabit iki sayfaya sığmıyor. Yazı boyutu veya şablon değişmez;
          metni ya da kayıtları azaltın.
        </p>
      )}
      <div id="master-cv-preview" className="max-h-[80vh] overflow-auto">
        <PaginatedCv
          document={document}
          pageLimit={2}
          zoom={zoom}
          onLayoutChange={onLayoutChange}
        />
      </div>
      <button
        aria-label="Önizleme genişliğini sürükleyin"
        className="absolute -left-2 top-1/2 hidden h-16 w-3 cursor-col-resize rounded bg-border lg:block"
        onPointerDown={(event) =>
          event.currentTarget.setPointerCapture(event.pointerId)
        }
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            onResize(-event.movementX);
        }}
        type="button"
      />
    </aside>
  );
}

function StructuredSection({
  section,
  label,
  items,
  onChange,
}: {
  section: string;
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
  const update = (index: number, key: string, value: string) =>
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
            {(section === "work"
              ? [
                  ["position", "Unvan"],
                  ["startDate", "Başlangıç (YYYY-MM)"],
                  ["endDate", "Bitiş (boşsa devam ediyor)"],
                ]
              : section === "education"
                ? [
                    ["area", "Bölüm"],
                    ["studyType", "Derece"],
                    ["startDate", "Başlangıç"],
                    ["endDate", "Bitiş"],
                  ]
                : section === "projects"
                  ? [
                      ["url", "Proje bağlantısı"],
                      ["startDate", "Tarih"],
                    ]
                  : section === "languages"
                    ? [["fluency", "Seviye"]]
                    : []
            ).map(([key, label]) => (
              <Field
                key={key}
                label={`${label} · ${index + 1}`}
                value={String(item[key] ?? "")}
                onChange={(value) => update(index, key, value)}
              />
            ))}
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
