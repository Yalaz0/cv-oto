"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg space-y-5 p-8">
      <h1 className="text-2xl font-semibold">Sayfa yüklenemedi</h1>
      <p>Lütfen yeniden deneyin. Kaydedilmiş verileriniz korunur.</p>
      <Button onClick={reset}>Yeniden dene</Button>
    </main>
  );
}
