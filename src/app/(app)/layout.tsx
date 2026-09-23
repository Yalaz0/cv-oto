import type { ReactNode } from "react";
import { requireUser } from "@/modules/auth/session.server";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return children;
}
