"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateGoogleCredential,
  revokeGoogleCredential,
  stageGoogleCredential,
} from "@/modules/credentials/actions";

export function AiCredentialForm() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [tested, setTested] = useState(false);
  const submit = async () => {
    setLoading(true);
    const result = await stageGoogleCredential(apiKey, "gemini-2.5-flash");
    setLoading(false);
    if (result.error) return toast.error(result.error);
    setApiKey("");
    setTested(true);
    toast.success(result.success);
  };
  return (
    <section className="max-w-2xl rounded-xl border bg-card p-6">
      <div className="flex gap-3">
        <ShieldCheck className="size-6 text-primary" />
        <div>
          <h2 className="font-semibold">Kişisel Gemini anahtarı</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            İsteğe bağlıdır. Anahtar tarayıcı depolamasına yazılmaz; yalnızca
            şifreli, kısa ömürlü bir onay kaydına alınır.
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <Label htmlFor="gemini-key">Gemini API anahtarı</Label>
        <Input
          id="gemini-key"
          autoComplete="off"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="AIza..."
        />
        <p className="text-xs text-muted-foreground">
          Anahtar eklemeden profilinizi ve taslağınızı hazırlamaya devam
          edebilirsiniz.
        </p>
      </div>
      <Button
        className="mt-5"
        disabled={loading || !apiKey.trim()}
        onClick={submit}
        type="button"
      >
        <KeyRound /> {loading ? "Güvenli kayda alınıyor" : "Bağlantıyı hazırla"}
      </Button>
      {tested && (
        <div className="mt-3 flex gap-2">
          <Button
            onClick={async () => {
              setLoading(true);
              const result = await activateGoogleCredential();
              setLoading(false);
              if (result.error) toast.error(result.error);
              else {
                setTested(false);
                toast.success(result.success);
              }
            }}
            disabled={loading}
          >
            Bağlantıyı kaydet
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const result = await revokeGoogleCredential();
              if (result.error) toast.error(result.error);
              else toast.success(result.success);
            }}
          >
            Bağlantıyı kaldır
          </Button>
        </div>
      )}
    </section>
  );
}
