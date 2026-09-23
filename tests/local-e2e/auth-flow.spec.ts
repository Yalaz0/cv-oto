import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const password = "tested-password-123";
const email = `auth-${randomUUID()}@example.test`;
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

test("email/password sign-in creates a durable protected session", async ({
  page,
}) => {
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
    await page.getByLabel("Ad soyad").fill("Local Test User");
    await page.getByRole("button", { name: "Sürümü kaydet" }).click();
    await expect(page.getByText("Profil sürümü kaydedildi.")).toBeVisible();
    await expect(page.getByText("Sürüm 1")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ana profiliniz" }),
    ).toBeVisible();
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Çıkış yap" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  } finally {
    await database.query("delete from auth.users where email = $1", [email]);
    await database.end();
  }
});
