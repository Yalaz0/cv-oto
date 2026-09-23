import Link from "next/link";
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <h1 className="text-3xl font-semibold">E-postanızı kontrol edin</h1>
      <p className="mt-5 text-sm leading-7">
        Hesabınızı doğrulamak için gelen kutunuzdaki bağlantıyı açın. İleti
        görünmüyorsa istenmeyen posta klasörünü kontrol edin.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Bağlantı geçersiz veya süresi dolmuş.
        </p>
      )}
      <Link
        href="/sign-in"
        className="mt-8 inline-block text-sm text-primary underline underline-offset-4"
      >
        Girişe dön
      </Link>
    </div>
  );
}
