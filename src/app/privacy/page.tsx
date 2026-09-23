import Link from "next/link";
export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/dashboard"
        className="text-sm text-primary underline underline-offset-4"
      >
        Çalışma alanına dön
      </Link>
      <h1 className="mt-8 text-3xl font-semibold">
        Gizlilik ve veri kullanımı
      </h1>
      <div className="mt-8 space-y-5 text-sm leading-7">
        <p>
          Profiliniz, başvurularınız ve CV sürümleriniz hesabınıza özeldir. AI
          üretiminde yalnızca seçtiğiniz doğrulanmış bilgiler kullanılır.
        </p>
        <p>
          Gemini bağlantısında API anahtarınız sunucuda şifreli saklanır.
          Seçilen bilgiler kendi anahtarınız üzerinden Google’a iletilir;
          kullanım, kota ve saklama koşulları sağlayıcının şartlarına tabidir.
        </p>
        <p>
          Uygulama günlükleri profil veya CV metni, ilan içeriği ya da API
          anahtarı içermez. PDF dosyaları varsayılan olarak kalıcı saklanmaz.
        </p>
      </div>
    </main>
  );
}
