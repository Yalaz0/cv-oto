import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("unauthenticated routes redirect to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Tekrar hoş geldiniz" }),
  ).toBeVisible();
});

test("sign-in form is responsive and accessible", async ({
  page,
}, testInfo) => {
  await page.goto("/sign-in");
  await expect(page.getByLabel("E-posta adresiniz")).toBeVisible();
  await expect(page.getByLabel("Parola")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("sign-in.png"),
    fullPage: true,
  });
});

test("sign-up is safely disabled when public configuration is unavailable", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await expect(
    page.getByRole("button", { name: "Hesap oluştur" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Bağlantı şu anda kullanılamıyor."),
  ).toBeVisible();
});
