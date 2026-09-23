"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaginatedCv } from "@/components/template/paginated-cv";
import "@/components/template/cv-template.css";
import { Button } from "@/components/ui/button";
import { rankVerifiedClaims } from "@/modules/applications/matching";
import {
  renameTailoredResume,
  restoreTailoredRevision,
  saveManualCv,
} from "@/modules/editor/actions";
import type { ManualDocument } from "@/modules/editor/document";
import type { MasterResumeDocument } from "@/modules/profile/schema";
import { fromProfile } from "@/modules/template/from-profile";

export function ResumeEditor({
  applicationId,
  title,
  company,
  jobDescription,
  profile,
  initialDocument,
  initialRevision,
  initialResumeId,
  initialName = "Untitled CV",
  revisions = [],
}: {
  applicationId?: string;
  title: string;
  company: string;
  jobDescription: string;
  profile: MasterResumeDocument;
  initialDocument: ManualDocument;
  initialRevision: number;
  initialResumeId?: string;
  initialName?: string;
  revisions?: Array<{
    revision: number;
    createdAt: string;
    source: string;
    document: ManualDocument;
  }>;
}) {
  const [document, setDocument] = useState(initialDocument);
  const [revision, setRevision] = useState(initialRevision);
  const [resumeId, setResumeId] = useState(initialResumeId);
  const [name, setName] = useState(initialName);
  const [zoom, setZoom] = useState<"fit" | 75 | 100 | 125>("fit");
  const [layout, setLayout] = useState({ pages: 0, overflow: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reviewedPayload, setReviewedPayload] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [saved, setSaved] = useState(
    initialRevision ? JSON.stringify(initialDocument) : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState("edit");
  const past = useRef<ManualDocument[]>([]);
  const future = useRef<ManualDocument[]>([]);
  const payload = JSON.stringify(document);
  const dirty = saved !== payload;
  const change = (next: ManualDocument) => {
    past.current = [...past.current.slice(-49), document];
    future.current = [];
    setDocument(next);
  };
  const save = useCallback(async () => {
    if (!applicationId) return;
    setPending(true);
    setError("");
    try {
      const result = await saveManualCv({
        applicationId,
        expectedRevision: revision,
        name,
        document: JSON.parse(payload),
      });
      if (result.error) {
        setError(result.error);
        setConflict(result.conflict ?? false);
      } else {
        setRevision(result.revision ?? revision);
        setSaved(payload);
        setResumeId(result.id);
      }
    } catch {
      setError(
        "Bağlantı kesildi. Değişiklikler bu ekranda korunuyor; yeniden deneyin.",
      );
    } finally {
      setPending(false);
    }
  }, [applicationId, revision, payload, name]);
  useEffect(() => {
    if (!dirty || pending || conflict || error || !applicationId) return;
    const timer = setTimeout(() => void save(), 800);
    return () => clearTimeout(timer);
  }, [dirty, pending, conflict, error, applicationId, save]);
  useEffect(() => {
    if (!dirty || !applicationId) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, applicationId]);
  const claims = Object.values(profile.registry).filter(
    (claim) => claim.status === "verified",
  );
  const ranks = rankVerifiedClaims(jobDescription, claims);
  const updateSummary = (summary: string) =>
    change({ ...document, cv: { ...document.cv, summary } });
  const downloadPdf = async () => {
    if (
      !resumeId ||
      dirty ||
      reviewedPayload !== payload ||
      layout.overflow ||
      layout.pages > 2
    )
      return;
    setExporting(true);
    setPdfError("");
    try {
      const response = await fetch(`/api/resumes/${resumeId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, reviewed: true }),
      });
      if (!response.ok) {
        const result = await response.json();
        setPdfError(
          result.error?.code === "PAGE_LIMIT_EXCEEDED"
            ? "İçerik sayfa sınırını aşıyor. İçeriği azaltın veya Otomatik seçin."
            : "PDF hazırlanamadı. Kayıt ve Chromium yapılandırmasını kontrol edin.",
        );
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = globalThis.document.createElement("a");
      link.href = url;
      link.download = "cv-tailor.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setPdfError("PDF bağlantısı kurulamadı. Yeniden deneyin.");
    } finally {
      setExporting(false);
    }
  };
  const switchVersion = async (targetRevision: number) => {
    if (!resumeId || switching) return;
    setSwitching(true);
    if (dirty) await save();
    const result = await restoreTailoredRevision({
      id: resumeId,
      revision: targetRevision,
    });
    if (result.error || !result.document)
      setError(result.error ?? "Sürüm değiştirilemedi.");
    else {
      setDocument(result.document as ManualDocument);
      setRevision(result.revision ?? revision);
      setSaved(JSON.stringify(result.document));
      setReviewedPayload("");
    }
    setSwitching(false);
  };
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <nav
          aria-label="Gezinti"
          className="mb-2 text-sm text-muted-foreground"
        >
          <Link href="/applications" className="underline">
            Başvurular
          </Link>{" "}
          / {title} / CV düzenle
        </nav>
        <p className="text-sm text-muted-foreground">
          {company} ·{" "}
          {applicationId ? "Manuel CV" : "Kurgusal örnek · kayıt yapılmaz"}
        </p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm">
          İlan → Kaynaklar → CV’yi düzenle → PDF indir
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href={`/applications/${applicationId ?? ""}`}>
            ← Başvuruya dön
          </Link>
        </Button>
        <Button
          disabled={!past.current.length}
          variant="outline"
          onClick={() => {
            const previous = past.current.pop();
            if (previous) {
              future.current.push(document);
              setDocument(previous);
            }
          }}
        >
          Geri al
        </Button>
        <Button
          disabled={!future.current.length}
          variant="outline"
          onClick={() => {
            const next = future.current.pop();
            if (next) {
              past.current.push(document);
              setDocument(next);
            }
          }}
        >
          İleri al
        </Button>
        <output className="text-sm">
          {pending
            ? "Kaydediliyor…"
            : error
              ? "Kayıt başarısız"
              : !applicationId
                ? "Örnek önizleme"
                : dirty
                  ? "Değişiklikler bekliyor"
                  : `Kaydedildi · Sürüm ${revision}`}
        </output>
        {error && (
          <Button
            disabled={conflict || pending}
            onClick={() => {
              setRetry(retry + 1);
              setError("");
            }}
          >
            Yeniden dene
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          Mehmet Yalaz şablonu · sabit 2 A4 sayfa
        </span>
        <label className="hidden text-sm">
          Sayfa tercihi{" "}
          <select
            className="rounded border p-2"
            value={document.pageLimit}
            onChange={(e) =>
              change({
                ...document,
                pageLimit:
                  e.target.value === "auto"
                    ? "auto"
                    : (Number(e.target.value) as 1 | 2 | 3),
              })
            }
          >
            <option value="auto">Otomatik</option>
            <option value="1">1 sayfa</option>
            <option value="2">2 sayfa</option>
            <option value="3">3 sayfa</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded border p-3">
        <label className="text-sm">
          CV adı{" "}
          <input
            className="ml-2 rounded border p-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={async () => {
              if (resumeId && name.trim())
                await renameTailoredResume({ id: resumeId, name });
            }}
          />
        </label>
        <Button
          variant="outline"
          onClick={() => setHistoryOpen((open) => !open)}
        >
          Sürüm geçmişi
        </Button>
        <label className="text-sm">
          <input
            type="checkbox"
            checked={reviewedPayload === payload}
            onChange={(e) =>
              setReviewedPayload(e.target.checked ? payload : "")
            }
          />{" "}
          CV’deki bilgileri kontrol ettim.
        </label>
        <Button
          onClick={downloadPdf}
          disabled={
            !resumeId ||
            dirty ||
            pending ||
            exporting ||
            reviewedPayload !== payload ||
            layout.overflow ||
            layout.pages > 2
          }
        >
          {exporting ? "PDF hazırlanıyor…" : "PDF indir"}
        </Button>
        {pdfError && (
          <p role="alert" className="text-sm text-destructive">
            {pdfError}
          </p>
        )}
      </div>
      {document.cv.locale !== profile.locale && (
        <p className="rounded border p-3 text-sm">
          Belge etiketleri seçtiğiniz dilde gösterilir. Kaynak metin otomatik
          çevrilmez; içerik dilini düzenleyin.
        </p>
      )}
      {(layout.overflow || layout.pages > 2) && (
        <p
          role="alert"
          className="rounded border border-destructive p-3 text-sm text-destructive"
        >
          İçerik sabit iki sayfalık şablona sığmıyor. PDF indirilemez; metni
          veya bölümleri azaltın.
        </p>
      )}
      {historyOpen && (
        <aside className="rounded-xl border p-4" aria-label="Sürüm geçmişi">
          <h2 className="font-semibold">Sürüm geçmişi</h2>
          <div className="mt-3 space-y-2">
            {revisions.map((item) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
                key={item.revision}
              >
                <span>
                  Sürüm {item.revision} ·{" "}
                  {new Date(item.createdAt).toLocaleString("tr-TR")} ·{" "}
                  {item.source}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => change(item.document)}
                  >
                    Önizle
                  </Button>
                  <Button
                    size="sm"
                    disabled={switching}
                    onClick={() => void switchVersion(item.revision)}
                  >
                    {switching ? "Geçiliyor…" : "Bu sürüme geç"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
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
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
        <section
          className={`${tab === "edit" ? "block" : "hidden"} space-y-5 lg:block`}
        >
          <details className="rounded-xl border p-4">
            <summary>İlan metni</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm">{jobDescription}</p>
          </details>
          <details className="rounded-xl border p-4">
            <summary>CV görüntü ayarları</summary>
            <p className="my-3 text-xs text-muted-foreground">
              Yalnızca isteğe bağlı satırları gösterir veya gizler; Mehmet Yalaz
              şablonunun ölçüleri ve bölüm sırası değişmez.
            </p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {(
                [
                  ["showLocation", "Konumu göster"],
                  ["showLinkedin", "LinkedIn’i göster"],
                  ["showGithub", "GitHub’ı göster"],
                  ["showReferences", "Referansları göster"],
                ] as const
              ).map(([key, label]) => (
                <label className="flex items-center gap-2" key={key}>
                  <input
                    checked={document.display[key] !== false}
                    type="checkbox"
                    onChange={(event) =>
                      change({
                        ...document,
                        display: {
                          ...document.display,
                          [key]: event.target.checked,
                        },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <label>
                Konum etiketi{" "}
                <select
                  className="ml-2 rounded border p-1"
                  value={document.display.locationLabel}
                  onChange={(event) =>
                    change({
                      ...document,
                      display: {
                        ...document.display,
                        locationLabel: event.target
                          .value as typeof document.display.locationLabel,
                      },
                    })
                  }
                >
                  <option>Şehir</option>
                  <option>Ülke</option>
                  <option>City</option>
                  <option>Country</option>
                </select>
              </label>
            </div>
          </details>
          <details className="rounded-xl border p-4">
            <summary>
              Kaynaklar · {document.selectedClaimIds.length} seçili
            </summary>
            <p className="my-3 text-xs text-muted-foreground">
              Anahtar kelime eşleşmesi; beceri veya deneyim kanıtı değildir.
              Seçimden tekrar oluşturmak manuel değişiklikleri değiştirir.
            </p>
            {claims.map((claim) => (
              <label key={claim.id} className="mb-3 flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={document.selectedClaimIds.includes(claim.id)}
                  onChange={(e) =>
                    change({
                      ...document,
                      selectedClaimIds: e.target.checked
                        ? [...document.selectedClaimIds, claim.id]
                        : document.selectedClaimIds.filter(
                            (id) => id !== claim.id,
                          ),
                    })
                  }
                />
                <span>
                  {claim.text}
                  <small className="block text-muted-foreground">
                    {claim.section} ·{" "}
                    {ranks
                      .find((rank) => rank.claimId === claim.id)
                      ?.matchedTerms.join(", ") || "Kelime eşleşmesi yok"}
                  </small>
                </span>
              </label>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    "CV seçili kaynaklardan yeniden oluşturulsun mu? Manuel değişiklikler yerine kaynak metinleri gelir; geri alabilirsiniz.",
                  )
                )
                  change({
                    ...document,
                    cv: fromProfile(
                      profile,
                      document.selectedClaimIds,
                      document.cv.locale,
                    ),
                  });
              }}
            >
              Seçili kaynaklardan oluştur
            </Button>
          </details>
          <section className="space-y-4 rounded-xl border p-4">
            <h2 className="font-semibold">CV içeriği</h2>
            <p className="text-xs text-muted-foreground">
              Düzenlemeler size aittir; ana profiliniz değişmez.
            </p>
            {(
              ["name", "title", "email", "phone", "location", "url"] as const
            ).map((key) => (
              <label key={key} className="block text-sm">
                {
                  {
                    name: "Ad soyad",
                    title: "Unvan",
                    email: "E-posta",
                    phone: "Telefon",
                    location: "Konum",
                    url: "Web sitesi",
                  }[key]
                }
                <input
                  className="mt-1 block w-full rounded border p-2"
                  value={document.cv.basics[key] ?? ""}
                  onChange={(e) =>
                    change({
                      ...document,
                      cv: {
                        ...document.cv,
                        basics: {
                          ...document.cv.basics,
                          [key]: e.target.value,
                        },
                      },
                    })
                  }
                />
              </label>
            ))}
            <label className="block text-sm">
              Profesyonel özet
              <textarea
                className="mt-1 min-h-32 w-full rounded border p-2"
                value={document.cv.summary ?? ""}
                onChange={(e) => updateSummary(e.target.value)}
              />
            </label>
            {(["work", "education", "projects", "references"] as const).map(
              (section) => (
                <fieldset key={section} className="space-y-3">
                  <legend className="font-medium">
                    {
                      {
                        work: "Deneyim",
                        education: "Eğitim",
                        projects: "Projeler",
                        references: "Referanslar",
                      }[section]
                    }
                  </legend>
                  {document.cv[section].map((entry, index) => (
                    <div
                      key={`${section}-${index.toString()}`}
                      className="rounded border p-3"
                    >
                      <label className="text-sm">
                        Başlık
                        <input
                          className="block w-full rounded border p-2"
                          value={entry.title}
                          onChange={(e) =>
                            change({
                              ...document,
                              cv: {
                                ...document.cv,
                                [section]: document.cv[section].map(
                                  (item, i) =>
                                    i === index
                                      ? { ...item, title: e.target.value }
                                      : item,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <label className="text-sm">
                        Maddeler (her satıra bir madde)
                        <textarea
                          className="min-h-24 w-full rounded border p-2"
                          value={entry.details.join("\n")}
                          onChange={(e) =>
                            change({
                              ...document,
                              cv: {
                                ...document.cv,
                                [section]: document.cv[section].map(
                                  (item, i) =>
                                    i === index
                                      ? {
                                          ...item,
                                          details: e.target.value.split("\n"),
                                        }
                                      : item,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!index}
                          onClick={() => {
                            const items = [...document.cv[section]];
                            [items[index - 1], items[index]] = [
                              items[index],
                              items[index - 1],
                            ];
                            change({
                              ...document,
                              cv: { ...document.cv, [section]: items },
                            });
                          }}
                        >
                          Yukarı taşı
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            change({
                              ...document,
                              cv: {
                                ...document.cv,
                                [section]: document.cv[section].filter(
                                  (_, i) => i !== index,
                                ),
                              },
                            })
                          }
                        >
                          Kaldır
                        </Button>
                      </div>
                    </div>
                  ))}
                </fieldset>
              ),
            )}
            {(["skills", "languages"] as const).map((section) => (
              <label key={section} className="block text-sm">
                {section === "skills" ? "Yetkinlikler" : "Diller"}
                <textarea
                  className="min-h-24 w-full rounded border p-2"
                  value={document.cv[section].join("\n")}
                  onChange={(e) =>
                    change({
                      ...document,
                      cv: {
                        ...document.cv,
                        [section]: e.target.value.split("\n"),
                      },
                    })
                  }
                />
              </label>
            ))}
          </section>
        </section>
        <section
          className={`${tab === "preview" ? "block" : "hidden"} min-w-0 rounded-xl border bg-muted/40 lg:sticky lg:top-4 lg:block`}
        >
          <div className="border-b bg-card p-4">
            <h2 className="font-semibold">Canlı CV önizlemesi</h2>
            <p className="text-xs text-muted-foreground">
              İçerik hemen güncellenir. A4 görünümü.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 border-b bg-card p-3">
            <span className="text-xs">Yakınlaştır:</span>
            {(["fit", 75, 100, 125] as const).map((value) => (
              <Button
                key={String(value)}
                size="sm"
                variant={zoom === value ? "default" : "outline"}
                onClick={() => setZoom(value)}
              >
                {value === "fit" ? "Sığdır" : `%${value}`}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                globalThis.document
                  .getElementById("cv-preview")
                  ?.requestFullscreen?.()
              }
            >
              Tam ekran
            </Button>
          </div>
          <div id="cv-preview" className="max-h-[80vh] overflow-auto">
            <PaginatedCv
              document={{ ...document.cv, display: document.display }}
              pageLimit={document.pageLimit}
              zoom={zoom}
              onLayoutChange={setLayout}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
