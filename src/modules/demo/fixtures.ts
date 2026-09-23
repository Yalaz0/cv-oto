export const demoResume = {
  basics: {
    name: "Deniz Örnek",
    label: "Operasyon ve Veri Analizi Uzmanı",
    email: "deniz.ornek@example.com",
    location: { city: "İstanbul" },
    summary:
      "Operasyon raporlaması, Excel ve SQL ile veri kontrolü, Power BI raporları hazırlama alanlarında deneyimli uzman. Sipariş verilerinin incelenmesi ve haftalık performans raporlarının hazırlanmasında görev aldı.",
  },
  work: [
    {
      name: "Örnek Lojistik A.Ş.",
      position: "Operasyon Analisti",
      startDate: "2023-01",
      endDate: "2025-12",
      highlights: [
        "Excel ve SQL kullanarak aylık 12.000 sipariş kaydının veri kontrolünü yaptı.",
        "Haftalık operasyon göstergelerini izlemek için 4 Power BI raporu hazırladı.",
        "Rapor hazırlama süresini 6 saatten 3 saate indiren ekip çalışmasına katkıda bulundu.",
      ],
    },
    {
      name: "Örnek Ticaret A.Ş.",
      position: "Operasyon Stajyeri",
      startDate: "2022-06",
      endDate: "2022-09",
      highlights: [
        "Excel ile stok hareketlerini kontrol etti ve haftalık rapor hazırladı.",
      ],
    },
  ],
  education: [
    {
      institution: "Örnek Üniversitesi",
      area: "Endüstri Mühendisliği",
      studyType: "Lisans",
      startDate: "2018",
      endDate: "2022",
    },
  ],
  projects: [
    {
      name: "Sipariş Takip Raporu",
      startDate: "2025",
      description:
        "SQL sorguları ve Power BI ile sipariş durumlarını gösteren bir raporlama projesi hazırladı.",
    },
  ],
  skills: [
    {
      name: "Veri analizi",
      keywords: [
        "Excel",
        "SQL",
        "Power BI",
        "Veri kontrolü",
        "Operasyon raporlama",
      ],
    },
  ],
  languages: [
    { language: "Türkçe", fluency: "Ana dil" },
    { language: "İngilizce", fluency: "B2" },
  ],
};
export const demoJobs = [
  {
    companyName: "Atlas Dağıtım",
    jobTitle: "Operasyon Analisti",
    locale: "tr-TR" as const,
    jobDescription:
      "Operasyon ekibimiz için Excel ve SQL kullanarak sipariş verilerini inceleyecek, haftalık performans raporları hazırlayacak ve süreç iyileştirme çalışmalarına katılacak bir Operasyon Analisti arıyoruz. Power BI deneyimi tercih sebebidir. Ekip çalışmasına yatkınlık ve veri doğruluğuna dikkat beklenmektedir.",
  },
  {
    companyName: "Northstar Analytics",
    jobTitle: "Junior Data Analyst",
    locale: "en-US" as const,
    jobDescription:
      "We are looking for a Junior Data Analyst to prepare SQL queries, maintain Power BI reports and check operational data quality. The role includes communicating findings to business teams and documenting recurring reporting tasks. Python experience is desirable but is not a mandatory requirement.",
  },
  {
    companyName: "Delta Üretim",
    jobTitle: "SAP Operasyon Uzmanı",
    locale: "tr-TR" as const,
    jobDescription:
      "Üretim operasyonlarımızda görev alacak, SAP MM modülünde uygulamalı deneyimi bulunan bir uzman arıyoruz. Adayın stok hareketlerini takip etmesi, operasyon raporları hazırlaması ve ekipler arasındaki veri akışını kontrol etmesi beklenmektedir. Excel bilgisi gereklidir; SAP sertifikası tercih sebebidir.",
  },
];
