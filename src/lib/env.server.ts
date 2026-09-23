import "server-only";
import { parseServerEnv } from "@/lib/env";

export function getServerEnv() {
  return parseServerEnv(process.env);
}
