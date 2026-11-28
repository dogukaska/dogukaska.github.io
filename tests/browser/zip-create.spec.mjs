import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

const JSZip = createRequire(import.meta.url)(resolve(process.env.DK_APPS_ROOT || "..", "pdf-epub/vendor/jszip.min.js"));

test("ZIP oluşturma Türkçe adları, yinelenen dosyaları ve boş dosyaları korur", async ({ page }) => {
  await page.goto("/dosya/arsiv/");
  await page.getByRole("link", { name: "ZIP Oluştur" }).click();
  const input = page.getByLabel("Dosya ekle");
  await input.setInputFiles([
    { name: "fotoğraf.txt", mimeType: "text/plain", buffer: Buffer.from("İlk dosya") },
    { name: "fotoğraf (2).txt", mimeType: "text/plain", buffer: Buffer.from("Özgün ad") },
    { name: "çıkar.txt", mimeType: "text/plain", buffer: Buffer.from("Listeden çıkarılacak") },
  ]);
  await input.setInputFiles([
    { name: "fotoğraf.txt", mimeType: "text/plain", buffer: Buffer.from("İkinci dosya") },
    { name: "boş.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) },
  ]);
  await page.getByRole("button", { name: "çıkar.txt dosyasını kaldır" }).click();
  await expect(page.locator("#zip-list")).toContainText("fotoğraf (3).txt");
  await page.getByLabel("Arşiv adı").fill("Müşteri belgeleri");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "ZIP indir" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Müşteri belgeleri.zip");
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files)).toEqual(["fotoğraf.txt", "fotoğraf (2).txt", "fotoğraf (3).txt", "boş.txt"]);
  expect(await zip.file("fotoğraf.txt").async("string")).toBe("İlk dosya");
  expect(await zip.file("fotoğraf (2).txt").async("string")).toBe("Özgün ad");
  expect(await zip.file("fotoğraf (3).txt").async("string")).toBe("İkinci dosya");
  expect((await zip.file("boş.txt").async("uint8array")).length).toBe(0);
});
