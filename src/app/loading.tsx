import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Yükleniyor"
      className="mx-auto w-full max-w-6xl space-y-6 p-8"
    >
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Sayfa yükleniyor.</span>
    </main>
  );
}
