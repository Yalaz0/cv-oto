"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  archiveApplication,
  deleteApplication,
  duplicateApplication,
} from "@/modules/applications/lifecycle-actions";
export function ApplicationActions({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (
    action: () => Promise<{ error?: string; id?: string }>,
  ) => {
    setBusy(true);
    try {
      const result = await action();
      if (result.error) toast.error(result.error);
      else if (result.id) router.push(`/applications/${result.id}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => run(() => duplicateApplication(id))}
      >
        Çoğalt
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => run(() => archiveApplication(id, !archived))}
      >
        {archived ? "Arşivden çıkar" : "Arşivle"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (
            window.confirm("Bu başvuru ve bağlı CV revizyonları silinsin mi?")
          )
            void run(() => deleteApplication(id));
        }}
      >
        Sil
      </Button>
    </div>
  );
}
