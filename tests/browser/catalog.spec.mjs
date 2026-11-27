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

test("büyüteç aramayı açar ve kapatınca araç listesi geri gelir", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Araç ara" });
  await expect(page.locator(".page-actions > button")).toHaveCount(3);
  await expect(page.locator(".page-actions > button").first()).toHaveAccessibleName("Araç ara");
  const input = page.getByRole("searchbox", { name: "Araç ara", includeHidden: true });
  const links = page.getByRole("navigation", { name: "Araçlar" }).getByRole("link");
  await expect(links.first()).toBeVisible();
  const toolCount = await links.count();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(input).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(input).toBeFocused();
  await input.fill("MOV");
  await expect(links.filter({ hasText: "Sesi Yazıya Çevir" })).toBeVisible();
  await expect.poll(() => links.count()).toBeLessThan(toolCount);

  await input.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(input).toBeHidden();
  await expect(links).toHaveCount(toolCount);

  await toggle.click();
  await expect(input).toHaveValue("");
  await input.fill("eşleşmeyecekörnek");
  await expect(page.getByRole("status")).toHaveText("Aramana uygun araç bulunamadı.");
  await toggle.click();
  await expect(page.getByRole("status")).toBeHidden();
  await expect(links).toHaveCount(toolCount);
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

test("altı araç iki sütunda görünür ve arama gizli araçları da bulur", async ({ page }) => {
  await page.goto("/");
  const category = page.getByRole("region", { name: "Belge ve Kitap" });
  await expect(category.getByRole("link")).toHaveCount(6);
  const list = category.getByRole("list");
  expect(await list.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);
  const more = category.getByRole("button", { name: "Diğer araçları gör" });
  await more.click();
  await expect(category.getByRole("link", { name: /PDF Ayır/ })).toBeVisible();
  await category.getByRole("button", { name: "Daha az göster" }).click();
  await expect(category.getByRole("link")).toHaveCount(6);
  await page.getByRole("button", { name: "Araç ara" }).click();
  await page.getByRole("searchbox", { name: "Araç ara" }).fill("filigran");
  await expect(category.getByRole("link", { name: /PDF Filigran/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Görsele Filigran/ })).toBeVisible();
});

test("Görsel Paylaş ve Arşiv Açıcı katalogda açılır", async ({ page }) => {
  await page.goto("/");
  const photo = page.getByRole("region", { name: "Fotoğraf", exact: true });
  await expect(photo.getByRole("link", { name: /Görsel Paylaş/ })).toHaveAttribute("href", "/foto/paylas/");
  const files = page.getByRole("region", { name: "Dosya", exact: true });
  await expect(files.getByRole("link", { name: /Arşiv Açıcı/ })).toHaveAttribute("href", "/dosya/arsiv/");
  await expect(page.locator('a[href="/dosya/paylas/"]')).toHaveCount(0);
});
