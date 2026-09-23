import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { signOut } from "@/modules/auth/actions";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-background p-4 focus:not-sr-only focus:fixed"
      >
        İçeriğe geç
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-8">
          <SidebarTrigger
            aria-label="Menüyü aç veya kapat"
            title="Menüyü aç veya kapat"
            className="size-11"
          />
          <Separator orientation="vertical" className="h-5!" />
          <span className="text-sm font-medium">Çalışma alanınız</span>
          <Badge variant="outline" className="ml-auto">
            Türkçe
          </Badge>
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="h-11">
              Çıkış yap
            </Button>
          </form>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 p-4 outline-none md:p-8 lg:p-10"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
