import { readFile } from "node:fs/promises";
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

test("Dosya Paylaşımı ve Arşiv Açıcı katalogda açılır", async ({ page }) => {
  await page.goto("/");
  const files = page.getByRole("region", { name: "Dosya", exact: true });
  await expect(files.getByRole("link", { name: /Dosya Paylaşımı/ })).toHaveAttribute("href", "/foto/paylas/");
  await expect(files.getByRole("link", { name: /Arşiv Açıcı/ })).toHaveAttribute("href", "/dosya/arsiv/");
  await files.getByRole("link", { name: /Dosya Paylaşımı/ }).click();
  await expect(page.getByRole("heading", { name: "Dosya Paylaşımı" })).toBeVisible();
  await expect(page.getByText(/Her gönderide toplam 100 MB/)).toBeVisible();
});

test("Farklı dosya türleri orijinal baytlarla paylaşılır ve ZIP olarak indirilebilir", async ({ page }) => {
  const id = "dK123456789";
  let packet;
  // WebKit's interception API omits Blob contents from multipart request bodies.
  await page.addInitScript(() => {
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      if (body instanceof FormData && body.get("files") instanceof Blob) {
        window.transferPacket = body.get("files").arrayBuffer();
      }
      return send.call(this, body);
    };
  });
  await page.route("https://tempfile.org/**", async (route) => {
    const request = route.request();
    const cors = { "Access-Control-Allow-Origin": "*" };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET, POST" } });
    } else if (request.method() === "POST" && request.url().endsWith("/api/upload/local")) {
      packet = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await window.transferPacket))));
      await route.fulfill({
        headers: cors,
        json: { success: true, files: [{ id, size: packet.length, expiryTime: Date.now() + 3_600_000 }] },
      });
    } else if (request.url().endsWith(`/${id}/download`) && packet) {
      await route.fulfill({ headers: cors, body: packet, contentType: "application/octet-stream" });
    } else {
      await route.abort();
    }
  });

  const document = Buffer.from("%PDF-1.7\n");
  await page.goto("/foto/paylas/");
  await page.getByLabel("Dosyaları seç").setInputFiles([
    { name: "Müşteri belgesi.pdf", mimeType: "application/pdf", buffer: document },
    { name: "README", mimeType: "", buffer: Buffer.from("İlk dosya") },
    { name: "README", mimeType: "", buffer: Buffer.alloc(0) },
  ]);
  await page.getByRole("button", { name: "Yükle ve bağlantı oluştur" }).click();
  await expect(page.getByRole("status")).toHaveText("Bağlantı hazır.");
  const link = await page.getByRole("textbox", { name: "Paylaşım bağlantısı", exact: true }).inputValue();
  await page.goto(link);
  await page.reload();
  await page.getByRole("button", { name: "Dosyaları al" }).click();
  const pdf = page.getByRole("button", { name: "Müşteri belgesi.pdf dosyasını indir" });
  await expect(pdf).toBeVisible();
  const [single] = await Promise.all([page.waitForEvent("download"), pdf.click()]);
  expect(single.suggestedFilename()).toBe("Müşteri belgesi.pdf");
  expect(await readFile(await single.path())).toEqual(document);

  const [archive] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Tümünü ZIP olarak indir" }).click(),
  ]);
  const bytes = Array.from(await readFile(await archive.path()));
  const names = await page.evaluate(async (contents) => {
    const zip = await window.JSZip.loadAsync(new Uint8Array(contents));
    return Object.keys(zip.files);
  }, bytes);
  expect(names).toEqual(["Müşteri belgesi.pdf", "README", "README (2)"]);
});

test("Hesaplama kategorisi açılır ve gizli araç aramada bulunur", async ({ page }) => {
  await page.goto("/");
  const category = page.getByRole("region", { name: "Hesaplama", exact: true });
  await expect(category.getByRole("link")).toHaveCount(6);
  await category.getByRole("button", { name: "Diğer araçları gör" }).click();
  await expect(category.getByRole("link")).toHaveCount(12);
  await category.getByRole("button", { name: "Daha az göster" }).click();
  await page.getByRole("button", { name: "Araç ara" }).click();
  await page.getByRole("searchbox", { name: "Araç ara" }).fill("yakit");
  await category.getByRole("link", { name: /Yakıt Maliyeti/ }).click();
  await expect(page.getByRole("heading", { name: "Yakıt Maliyeti" })).toBeVisible();
  await page.getByRole("link", { name: "Hesaplama araçları" }).click();
  await expect(page.getByRole("navigation", { name: "Hesaplama araçları" }).getByRole("link")).toHaveCount(12);
});
