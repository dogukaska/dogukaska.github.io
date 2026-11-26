import { expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { test } from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, degrees, StandardFonts } = require(resolve(process.env.DK_APPS_ROOT || "..", "belge/vendor/pdf-lib.min.js"));

async function sample() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const title of ["Ilk sayfa", "Ikinci sayfa", "Son sayfa"]) {
    const page = doc.addPage([420, 300]);
    page.drawText(title, { x: 72, y: 170, size: 23, font });
  }
  doc.getPage(1).setRotation(degrees(90));
  return Buffer.from(await doc.save());
}

async function load(page, mode, bytes) {
  await page.goto("/belge/pdf-araclari/?arac=" + mode);
  await page.locator("#file").setInputFiles({ buffer: Buffer.from(bytes), name: "ornek.pdf", mimeType: "application/pdf" });
  await expect(page.locator("#file-info")).toContainText("sayfa");
}

async function download(page, name = "PDF indir") {
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name, exact: true }).click()]);
  return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) };
}

async function pageText(page, bytes) {
  return page.evaluate(async (values) => {
    const lib = await import("/pdf-epub/vendor/pdfjs/pdf.min.mjs");
    lib.GlobalWorkerOptions.workerSrc = "/pdf-epub/vendor/pdfjs/pdf.worker.min.mjs";
    const doc = await lib.getDocument({ data: Uint8Array.from(values), isEvalSupported: false }).promise;
    try {
      return await Promise.all(Array.from({ length: doc.numPages }, async (_, n) => {
        const pdfPage = await doc.getPage(n + 1);
        return (await pdfPage.getTextContent()).items.map(item => item.str).join(" ");
      }));
    } finally { await doc.destroy(); }
  }, [...bytes]);
}

test("PDF numarası ve Türkçe filigran metin katmanına eklenir", async ({ page }) => {
  const source = await sample();
  await load(page, "numara", source);
  await page.locator("#start").fill("7");
  await page.locator("#font").selectOption("mono");
  const numbered = await download(page);
  const texts = await pageText(page, numbered.bytes);
  expect(texts.map(t => t.trim().split(/\s+/).at(-1))).toEqual(["7", "8", "9"]);

  await load(page, "filigran", source);
  await page.locator("#mark-text").fill("İstanbul Çeşme");
  const marked = await download(page);
  expect((await pageText(page, marked.bytes)).every(t => t.includes("İstanbul Çeşme"))).toBe(true);
});

test("PDF kırpma döndürülmüş sayfada doğru kenarı kullanır ve aralık sayfa ayırır", async ({ page }) => {
  const source = await sample();
  await load(page, "kirp", source);
  await page.locator("#left").fill("10");
  await page.locator("#top").fill("20");
  await page.locator("#range").fill("2");
  const cropped = await PDFDocument.load((await download(page)).bytes);
  expect(cropped.getPage(0).getCropBox()).toEqual({ x: 0, y: 0, width: 420, height: 300 });
  expect(cropped.getPage(1).getCropBox()).toEqual({ x: 84, y: 30, width: 336, height: 270 });

  await load(page, "ayir", source);
  await page.locator("#groups").fill("2–3");
  const part = await PDFDocument.load((await download(page)).bytes);
  expect(part.getPageCount()).toBe(2);
  await page.locator("#groups").fill("1; 3");
  const zip = await download(page);
  expect(zip.name).toMatch(/\.zip$/);
  expect(zip.bytes.subarray(0, 2).toString()).toBe("PK");
});

test("dört tür etkileşimli alan oluşturulur ve Türkçe form verisi kaydedilir", async ({ page }) => {
  await page.goto("/belge/pdf-araclari/?arac=form");
  for (const [kind, name] of [["text", "Ad soyad"], ["check", "Onay"], ["radio", "Durum"], ["list", "Şehir"]]) {
    await page.getByRole("button", { name: "Alan ekle" }).click();
    const fieldset = page.locator(".new-field").last();
    await fieldset.locator("[data-field-type]").selectOption(kind);
    await fieldset.locator("[data-field-name]").fill(name);
    if (kind === "radio" || kind === "list") await fieldset.locator("[data-field-options]").fill("İstanbul\nİzmir");
  }
  const blank = await download(page);
  const form = (await PDFDocument.load(blank.bytes)).getForm();
  expect(form.getFields()).toHaveLength(4);
  await page.reload();
  await page.locator("#file").setInputFiles({ buffer: blank.bytes, name: "form.pdf", mimeType: "application/pdf" });
  await page.getByLabel("Ad soyad").fill("Çağla Işık");
  await page.getByLabel("Onay").check();
  await page.getByLabel("Durum").selectOption("İzmir");
  await page.getByLabel("Şehir").selectOption("İstanbul");
  const filled = (await PDFDocument.load((await download(page)).bytes)).getForm();
  expect(filled.getTextField("dc_Ad soyad").getText()).toBe("Çağla Işık");
  expect(filled.getCheckBox("dc_Onay").isChecked()).toBe(true);
  expect(filled.getRadioGroup("dc_Durum").getSelected()).toBe("İzmir");
  expect(filled.getDropdown("dc_Şehir").getSelected()).toEqual(["İstanbul"]);
});

test("çizilen imza PDF’e eklenir ve küçük resimler sürüklenir", async ({ page }) => {
  const source = await sample();
  await load(page, "imza", source);
  const pad = page.locator("#screen-signature");
  const rect = await pad.boundingBox();
  await page.mouse.move(rect.x + 18, rect.y + 18);
  await page.mouse.down();
  await page.mouse.move(rect.x + 100, rect.y + 37, { steps: 4 });
  await page.mouse.up();
  const signed = await download(page);
  expect(signed.name).toBe("ornek-imzali.pdf");
  expect(signed.bytes.length).toBeGreaterThan(source.length);

  await page.goto("/belge/pdf/?arac=birlestir");
  await page.locator("#file").setInputFiles({ buffer: source, name: "ornek.pdf", mimeType: "application/pdf" });
  await expect(page.locator("#pages li")).toHaveCount(3);
  const grip = await page.locator(".page-grip").first().boundingBox();
  const row = await page.locator("#pages li").nth(1).boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator("#pages li").first()).toContainText("Sayfa 2");
  const organized = await download(page, "Seçili sayfaları indir");
  expect((await pageText(page, organized.bytes))[0]).toContain("Ikinci sayfa");
});

test("OCR taramasından seçilebilir Türkçe metin çıkar", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1600, 480);
    ctx.fillStyle = "black"; ctx.font = "66px DejaVu Sans, sans-serif";
    ctx.fillText("Türkçe tarama örneği", 70, 120);
    ctx.fillText("İstanbul, ılık çay ve güzel öğle.", 70, 235);
    ctx.fillText("Şehir, yağmur, güneş, özgürlük.", 70, 350);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(Buffer.from(png, "base64"));
  doc.addPage([800, 240]).drawImage(image, { x: 0, y: 0, width: 800, height: 240 });
  await load(page, "ocr", await doc.save());
  const [file] = await Promise.all([page.waitForEvent("download", { timeout: 75_000 }), page.getByRole("button", { name: "PDF indir" }).click()]);
  const out = await pageText(page, await readFile(await file.path()));
  expect(out[0]).toContain("Türkçe tarama örneği");
  expect(out[0]).toContain("İstanbul");
  expect(out[0]).toContain("özgürlük");
});

test("PDF küçültme dosyayı büyütmez ve kayıpsız mod metni korur", async ({ page }) => {
  const doc = await PDFDocument.load(await sample());
  const large = await doc.save({ useObjectStreams: false });
  await load(page, "kucult", large);
  const out = await download(page);
  expect(out.bytes.length).toBeLessThan(large.byteLength);
  expect((await pageText(page, out.bytes))[1]).toContain("Ikinci sayfa");
});

test("GIF filigranı hareketi ve kare sürelerini korur, meme şablonu PNG üretir", async ({ page }) => {
  const source = Buffer.from("R0lGODlhYABAAIEAAMgoMgAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwECAAAh+QQAEAAAACwAAAAAYABAAAAIgAABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPn0CDCh1KtKjRo0iTKl3KtKnTp1CjSp1KtarVq1izat3KtavXr2DDih1LtqzZs2jTql3Ltq3bkwEBACH5BAEYAAEALAAAAABgAEAAgSha3AAAAAAAAAAAAAiAAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWLGDNq3Mixo8ePIEOKHEmypMmTKFOqXMmypcuXMGPKnEmzps2bOHPq3Mmzp8+fQIMKHUq0qNGjSJMqXcq0qdOnUKNKnUq1qtWrWLNq3cq1q9evYMOKHUu2rNmzaNOqXcu2rduTAQEAOw==", "base64");
  await page.goto("/foto/studyo/?arac=filigran");
  await page.locator("#file").setInputFiles({ buffer: source, name: "ornek.gif", mimeType: "image/gif" });
  await expect(page.locator("#frame-note")).toBeVisible();
  await page.locator("#text").fill("Çeşme");
  const out = await download(page, "Görseli indir");
  expect(out.name).toBe("ornek-filigran.gif");
  const frames = await page.evaluate(async values => {
    const { parseGIF, decompressFrames } = (await import("/foto/studyo/gif-reader.js")).default;
    const parsed = parseGIF(Uint8Array.from(values).buffer);
    return decompressFrames(parsed, true).map(frame => frame.delay);
  }, [...out.bytes]);
  expect(frames).toEqual([160, 240]);
  await page.goto("/foto/studyo/?arac=meme");
  await page.locator("#template").selectOption("expect");
  const image = await download(page, "Görseli indir");
  expect(image.bytes.subarray(1, 4).toString()).toBe("PNG");
});
