export async function register() {
  // next build does not need runtime secrets; next start and deployments do.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { getServerEnv } = await import("@/lib/env.server");
    getServerEnv();
  }
}
