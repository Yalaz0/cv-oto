"use client";

import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { title: "Genel bakış", href: "/dashboard", icon: LayoutDashboard },
  { title: "Ana profil", href: "/profile", icon: UserRound },
  { title: "Başvurular", href: "/applications", icon: FolderOpen },
  { title: "AI ayarları", href: "/settings/ai", icon: Settings2 },
];

// Adapted from the official shadcn dashboard-01 AppSidebar.
export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="CV Tailor">
              <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <FileText className="size-5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold tracking-tight">
                    CV Tailor
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Deneyiminiz, doğru ifadeyle.
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Çalışma alanı</SidebarGroupLabel>
          <nav aria-label="Ana menü">
            <SidebarMenu>
              {navigation.map(({ title, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === href || pathname.startsWith(`${href}/`)
                    }
                    tooltip={title}
                    className="h-11"
                  >
                    <Link
                      href={href}
                      onClick={() => setOpenMobile(false)}
                      aria-current={pathname === href ? "page" : undefined}
                    >
                      <Icon />
                      <span>{title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-5">
        <div className="rounded-lg border border-sidebar-border p-4 group-data-[collapsible=icon]:hidden">
          <ShieldCheck
            className="mb-2 size-5 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">
            Bilgileriniz sizin kontrolünüzde
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            CV’nizde yalnızca doğruladığınız deneyimlere yer verin.
          </p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Gizlilik">
              <Link href="/privacy">
                <ShieldCheck />
                <span>Gizlilik</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <span className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          CV Tailor · v0.1.0
        </span>
      </SidebarFooter>
    </Sidebar>
  );
}
