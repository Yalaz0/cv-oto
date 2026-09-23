# Uygulama durumu

## Uygulanan ve doğrulanan

- Kaynak profil sürümleri, doğrulama durumu, JSON Resume içe/dışa aktarma, fotoğraf işleme ve PDF metin içe aktarma bulunuyor.
- Başvuru oluşturma, doğrulanmış profil önkoşulu, yinelenen istek koruması, arşivleme, çoğaltma ve silme uygulanmıştır.
- Başvuru sayfası, başvuruya bağlanan değişmez profil sürümünden gerçek CV önizlemesi oluşturur. Kaynak seçimi, manuel düzenleme, 800 ms otomatik kayıt, sürüm çakışması, geri/ileri alma ve kaynak inceleme vardır.
- Kurgusal Deniz Örnek profili ile Atlas Dağıtım, Northstar Analytics ve Delta Üretim örnekleri eklendi. `/demo` kaydetmeden akışı gösterir.
- PDF üretimi kullanıcı sahipliği, tek kullanımlık baskı erişimi, A4 sayfalama, taşma/sayfa sınırı ve metin doğrulaması ile uygulanmıştır.
- Gemini anahtarı tarayıcı dışında AES-256-GCM ile bekleyen kayda alınır; sağlayıcı testi sonrasında açık kullanıcı onayıyla etkinleşir.

## Kontrol sonuçları

- Biome lint başarılı.
- TypeScript denetimi başarılı.
- Vitest: 13 dosya, 30 test başarılı. Profil hazırlığı, idempotent başvuru, kaynak sahipliği ve CV sürüm çakışması test edilir.

## Dış ortamda tamamlanacak kabul kapıları

- Gerçek Gemini anahtarıyla kontrollü sağlayıcı kabul testi.
- Referans CV PDF’si ile insan tarafından görsel şablon kabulü.
- Staging/Vercel ortamında Chromium PDF ve migration geri dönüş provası.
- Chromium, Firefox ve WebKit erişilebilirlik/performans kabulü ile iki kullanıcı Storage izolasyonu.

Bu belge yalnızca yukarıdaki kanıtları ifade eder; dış ortam kontrolleri tamamlanmadan uygulama üretime hazır kabul edilmez.
