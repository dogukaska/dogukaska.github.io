import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

test("katalog ve uygulama girişleri dar ekranda açılır", async ({ page, baseURL, browserName }) => {
  const missing = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === baseURL && url.pathname !== "/favicon.ico" && response.status() >= 400) {
      missing.push(`${response.status()} ${url.pathname}`);
    }
  });
  await page.goto("/");
  const links = page.locator(".tool-list .app");
  await expect(links.first()).toBeVisible();
  const routes = await links.evaluateAll((all) => all.map((item) => item.getAttribute("href")));
  await page.locator("#tool-search").fill("MOV");
  await expect(page.getByRole("link", { name: /Sesi Yazıya Çevir/ })).toBeVisible();

  const mobileRoutes = ["/x-notes/", "/doviz/", "/qr/", "/qr/oku/", "/foto/gizle/"];
  const pages = browserName === "webkit" ? mobileRoutes : [...new Set(routes), "/metin-veri/"];
  for (const route of ["/", ...pages]) {
    await test.step(route, async () => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/\S/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  }
  expect(missing).toEqual([]);
});

test("not kaydı sayfa yenilemesinden sonra kalır", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 840 });
  await page.goto("/x-notes/");
  const note = page.getByText("İstanbul deneme notu", { exact: true });
  await page.locator("#quick-text").fill("İstanbul deneme notu");
  await page.locator("#quick-save").click();
  await expect(note).toBeVisible();
  await page.reload();
  await expect(note).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#open-drawer").click();
  await expect(page.locator("#profile-drawer")).toBeVisible();
});
