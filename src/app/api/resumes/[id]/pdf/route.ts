import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { PDFParse } from "pdf-parse";
import { chromium } from "playwright";
import { z } from "zod";
import { parsePublicEnv } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { manualDocumentSchema } from "@/modules/editor/document";
export const runtime = "nodejs";
export const maxDuration = 45;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const env = parsePublicEnv(process.env);
  const fail = (code: string, status: number) =>
    Response.json({ error: { code } }, { status });
  if (
    !isAllowedOrigin(
      request.headers.get("origin"),
      env.NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV === "development",
    )
  )
    return fail("INVALID_ORIGIN", 403);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("NOT_FOUND", 404);
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user)
    return fail("AUTH_REQUIRED", 401);
  const input = z
    .object({
      revision: z.number().int().positive(),
      reviewed: z.literal(true),
    })
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return fail("REVIEW_REQUIRED", 400);
  const { data, error } = await client
    .from("tailored_resumes")
    .select("document,current_revision")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return fail("NOT_FOUND", 404);
  if (data.current_revision !== input.data.revision)
    return fail("REVISION_CONFLICT", 409);
  const document = manualDocumentSchema.parse(data.document);
  const token = randomBytes(32).toString("hex");
  const issued = await client.rpc("issue_print_token", {
    p_resume_id: id,
    p_revision: input.data.revision,
    p_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (issued.error) return fail("PRINT_UNAVAILABLE", 503);
  const origin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let parser: PDFParse | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    browser = await chromium.launch({ headless: true, timeout: 10000 });
    timer = setTimeout(() => void browser?.close(), 35000);
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.addCookies(
      (await cookies()).getAll().map((cookie) => ({
        ...cookie,
        url: origin,
        httpOnly: true,
        sameSite: "Lax" as const,
        secure: origin.startsWith("https:"),
      })),
    );
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      const allowed =
        url.origin === origin &&
        (url.pathname === `/print/${token}` ||
          url.pathname.startsWith("/_next/static/"));
      return allowed ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${origin}/print/${token}`, { waitUntil: "networkidle" });
    await page.locator('[data-pagination-ready="true"]').waitFor();
    await page.evaluate(() =>
      globalThis.document.fonts.ready.then(() => undefined),
    );
    const overflow =
      (await page
        .locator('[data-pagination-ready="true"]')
        .getAttribute("data-overflow")) === "true" ||
      (await page
        .locator(".cv-page")
        .evaluateAll((elements) =>
          elements.some(
            (element) => element.scrollWidth > element.clientWidth + 1,
          ),
        ));
    if (overflow) return fail("LAYOUT_OVERFLOW", 422);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    parser = new PDFParse({ data: pdf });
    const info = await parser.getInfo();
    if (document.pageLimit !== "auto" && info.total > document.pageLimit)
      return fail("PAGE_LIMIT_EXCEEDED", 422);
    const extracted = await parser.getText();
    if (!extracted.text.includes(document.cv.basics.name))
      return fail("PDF_VALIDATION_FAILED", 422);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=cv-tailor.pdf",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return fail("PDF_UNAVAILABLE", 503);
  } finally {
    if (timer) clearTimeout(timer);
    await parser?.destroy();
    await browser?.close();
  }
}
