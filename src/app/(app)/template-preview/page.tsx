import "@/components/template/cv-template.css";
import { AppShell } from "@/components/app-shell";
import { CvTemplate } from "@/components/template/cv-template";
import type { CvTemplateDocument } from "@/modules/template/types";

const preview: CvTemplateDocument = {
  locale: "tr-TR",
  basics: {
    name: "Ad Soyad",
    title: "Profesyonel Unvan",
    email: "ad.soyad@example.com",
    phone: "+90 555 000 00 00",
    location: "İstanbul, Türkiye",
    url: "linkedin.com/in/ornek",
  },
  summary:
    "Doğrulanmış deneyimleri anlaşılır, ölçülebilir ve pozisyona uygun bir anlatıma dönüştüren profesyonel özet örneği.",
  education: [
    {
      title: "Üniversite Adı",
      subtitle: "Bölüm",
      date: "2018 — 2022",
      details: ["Başarı ve ilgili çalışma alanı."],
    },
  ],
  work: Array.from({ length: 5 }, (_, index) => ({
    title: `Şirket ${index + 1}`,
    subtitle: "Rol / Pozisyon",
    date: `${2020 + index} — Günümüz`,
    location: "İstanbul",
    details: [
      "Doğrulanmış sorumluluk ve sonuç odaklı katkı.",
      "İkinci destekleyici deneyim veya metrik ifadesi.",
    ],
  })),
  skills: [
    "Proje yönetimi",
    "Analiz",
    "İletişim",
    "Raporlama",
    "Paydaş yönetimi",
    "Problem çözme",
  ],
  languages: ["Türkçe — Ana dil", "İngilizce — Profesyonel çalışma"],
  projects: [
    {
      title: "Örnek proje",
      subtitle: "Rol",
      date: "2024",
      details: ["Amaç, katkı ve doğrulanabilir sonuç."],
    },
  ],
  references: [
    {
      title: "Referans adı",
      subtitle: "Unvan · Kurum",
      details: ["İletişim bilgisi kullanıcı onayıyla eklenir."],
    },
  ],
};

export default function TemplatePreviewPage() {
  return (
    <AppShell>
      <div className="cv-canvas">
        <CvTemplate document={preview} />
      </div>
    </AppShell>
  );
}
