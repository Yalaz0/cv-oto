import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { Client } from "pg";

const password = "tested-password-123";
const email = `auth-${randomUUID()}@example.test`;
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

test("email/password sign-in creates a durable protected session", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/sign-up");
  await page.getByLabel("Adınız").fill("Local Test User");
  await page.getByLabel("E-posta adresiniz").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page).toHaveURL(/\/verify$/);

  const database = new Client({ connectionString: databaseUrl });
  await database.connect();
  try {
    await database.query(
      "update auth.users set email_confirmed_at = now() where email = $1",
      [email],
    );
    const authProbe = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { persistSession: false } },
    );
    const probe = await authProbe.auth.signInWithPassword({ email, password });
    expect(probe.error).toBeNull();
    await authProbe.auth.signOut();
    await page.goto("/sign-in");
    await page.getByLabel("E-posta adresiniz").fill(email);
    await page.getByLabel("Parola").fill(password);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Genel bakış" }),
    ).toBeVisible();
    await page.goto("/profile");
    await page.getByRole("button", { name: "Örnek verilerle başla" }).click();
    await page.getByRole("button", { name: "Tüm ifadeleri doğrula" }).click();
    await page.getByRole("button", { name: "Sürümü kaydet" }).click();
    await expect(page.getByText("Profil sürümü kaydedildi.")).toBeVisible();
    await expect(page.getByText("Sürüm 1").first()).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ana profiliniz" }),
    ).toBeVisible();
    await page.goto("/applications/new");
    await page.getByRole("button", { name: "Örnek: Atlas Dağıtım" }).click();
    await page.getByRole("button", { name: "Başvuruyu oluştur" }).click();
    await expect(page).toHaveURL(/\/applications\/[a-f0-9-]+$/);
    await expect(page.locator(".cv-page").first()).toContainText("Deniz Örnek");
    await expect(page.getByText(/Kaydedildi · Sürüm/)).toBeVisible();
    const summary = page.getByLabel("Profesyonel özet", { exact: true });
    await summary.fill(
      "Excel, SQL ve Power BI ile operasyon raporlama deneyimi.",
    );
    await expect(page.locator(".cv-page .cv-summary")).toContainText(
      "Excel, SQL ve Power BI",
    );
    await expect(page.getByText(/Kaydedildi · Sürüm/)).toBeVisible();
    await page.reload();
    await expect(summary).toHaveValue(
      "Excel, SQL ve Power BI ile operasyon raporlama deneyimi.",
    );
    await page.getByLabel("CV’deki bilgileri kontrol ettim.").check();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/resumes/") &&
        response.url().endsWith("/pdf"),
    );
    const download = page.waitForEvent("download", { timeout: 45000 });
    await page.getByRole("button", { name: "PDF indir", exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    const file = await download;
    await file.saveAs(".cache/demo-cv.pdf");
    const parser = new PDFParse({ data: await readFile(".cache/demo-cv.pdf") });
    try {
      expect((await parser.getInfo()).total).toBeLessThanOrEqual(2);
      expect((await parser.getText()).text).toContain("Deniz Örnek");
    } finally {
      await parser.destroy();
    }
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Çıkış yap" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  } finally {
    await database.query("delete from auth.users where email = $1", [email]);
    await database.end();
  }
});
