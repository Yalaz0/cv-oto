import { AppShell } from "@/components/app-shell";
import { AiCredentialForm } from "@/components/settings/ai-credential-form";
export default function AiSettingsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">AI ayarları</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        Gemini anahtar bağlantısı Faz 4’te eklenecek. Anahtarlar asla tarayıcı
        deposunda saklanmayacaktır.
      </p>
      <div className="mt-8">
        <AiCredentialForm />
      </div>
    </AppShell>
  );
}
