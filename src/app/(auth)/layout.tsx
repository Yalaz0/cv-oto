import { FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-semibold"
        >
          <FileText />
          CV Tailor
        </Link>
        <div className="max-w-lg">
          <p className="mb-6 text-sm text-blue-100">
            DENEYİMİNİZ, DOĞRU İFADEYLE.
          </p>
          <h2 className="text-5xl font-semibold leading-tight tracking-tight">
            Bir profil.
            <br />
            Her fırsata özel
            <br />
            bir anlatım.
          </h2>
          <p className="mt-7 text-base leading-8 text-blue-100">
            Bilgilerinizin doğruluğunu ve CV’nizin tasarımını koruyarak bir
            sonraki başvurunuza hazırlanın.
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm text-blue-100">
          <ShieldCheck className="size-4" />
          Son söz her zaman sizde.
        </p>
      </section>
      <section className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-12 flex items-center gap-2 font-semibold text-primary lg:hidden"
          >
            <FileText />
            CV Tailor
          </Link>
          {children}
          <p className="mt-12 text-xs leading-6 text-muted-foreground">
            Verilerinizin nasıl kullanıldığını{" "}
            <Link className="underline underline-offset-4" href="/privacy">
              gizlilik açıklamasından
            </Link>{" "}
            inceleyebilirsiniz.
          </p>
        </div>
      </section>
    </main>
  );
}
