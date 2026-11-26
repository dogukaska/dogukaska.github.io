import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { download, test } from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const apps = resolve(process.env.DK_APPS_ROOT || "..");
const { PDFDocument } = require(resolve(apps, "belge/vendor/pdf-lib.min.js"));
const JSZip = require(resolve(apps, "pdf-epub/vendor/jszip.min.js"));

test("geciken kamera izni kapatılmış oturumu açmaz", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => {
      window.releaseCamera = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const stream = canvas.captureStream(5);
        [window.auditTrack] = stream.getVideoTracks();
        resolve(stream);
      };
    });
  });
  await page.goto("/belge/");
  await page.locator("#open-cam").click();
  await page.waitForFunction(() => window.releaseCamera);
  await page.locator("#cam-close").click();
  await page.evaluate(() => window.releaseCamera());
  await expect.poll(() => page.evaluate(() => window.auditTrack?.readyState)).toBe("ended");
  await expect(page.locator("#cam")).toBeHidden();
});

test("WAV ve MP3 kısa stereo farkını korur", async ({ page }) => {
  await page.goto("/video/ses-kirp/");
  const result = await page.evaluate(async () => {
    const { toWav, toMp3 } = await import("/video/lib/audio.js");
    const left = new Float32Array(4096);
    const right = new Float32Array(left.length);
    right[17] = 0.2;
    const buffer = {
      length: left.length,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: (channel) => channel ? right : left,
    };
    const wav = new DataView(await toWav(buffer).arrayBuffer());
    const mp3 = await toMp3(buffer, 192);
    const audio = new OfflineAudioContext(2, 1, 44100);
    const decoded = await audio.decodeAudioData(await mp3.arrayBuffer());
    return {
      wavChannels: wav.getUint16(22, true),
      wavLeft: wav.getInt16(44 + 17 * 4, true),
      wavRight: wav.getInt16(46 + 17 * 4, true),
      mp3Channels: decoded.numberOfChannels,
    };
  });
  expect(result).toEqual({ wavChannels: 2, wavLeft: 0, wavRight: 6553, mp3Channels: 2 });
});

test("ince görsel küçültülür ve bitmap hatasından sonra yine açılır", async ({ page }) => {
  await page.goto("/foto/hedef-boyut/");
  const sizes = await page.evaluate(async () => {
    const { fitCanvas, decode } = await import("/foto/lib/image.js");
    const strip = document.createElement("canvas");
    strip.width = 4000;
    strip.height = 1;
    strip.getContext("2d").fillRect(0, 0, 4000, 1);
    const resized = fitCanvas(strip, 640);
    window.createImageBitmap = async () => { throw new Error("Bitmap açılamadı"); };
    const blob = await new Promise((resolve) => resized.toBlob(resolve));
    const decoded = await decode(new File([blob], "ince.png", { type: "image/png" }));
    return [resized.width, resized.height, decoded.width];
  });
  expect(sizes).toEqual([640, 1, 640]);
});

test("küçük seçili alan bulanıklaşır", async ({ page }) => {
  await page.goto("/foto/gizle/");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 24;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 40, 24);
    ctx.fillStyle = "black";
    for (let x = 0; x < 40; x += 2) ctx.fillRect(x, 0, 1, 24);
    return canvas.toDataURL().split(",")[1];
  });
  await page.locator("#file").setInputFiles({
    name: "cizgiler.png", mimeType: "image/png", buffer: Buffer.from(image, "base64"),
  });
  await page.locator(".position-controls summary").click();
  for (const [id, value] of Object.entries({ x: 4, y: 4, w: 8, h: 8 })) {
    await page.locator("#" + id).fill(String(value));
  }
  await page.locator("#rect button").click();
  const [inside, outside] = await page.locator("#preview").evaluate((canvas) => {
    const ctx = canvas.getContext("2d");
    return [ctx.getImageData(8, 8, 1, 1).data[0], ctx.getImageData(22, 8, 1, 1).data[0]];
  });
  expect(inside).toBeGreaterThan(60);
  expect(inside).toBeLessThan(196);
  expect(outside).toBe(0);
});

test("QR oluşturma ve okuma uluslararası numarayı değiştirmez", async ({ page }) => {
  await page.goto("/qr/");
  await page.locator('[data-m="wa"]').click();
  await page.locator("#wa").fill("+501 123 4567");
  const image = await page.locator("#qr").evaluate((canvas) => canvas.toDataURL().split(",")[1]);
  await page.goto("/qr/oku/");
  await page.locator("#file").setInputFiles({
    name: "wa.png", mimeType: "image/png", buffer: Buffer.from(image, "base64"),
  });
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#content")).toHaveValue("https://wa.me/5011234567");
});

test("geciken CSV okuması yeni metni ezmez", async ({ page }) => {
  await page.addInitScript(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== "eski.csv") return read.call(this);
      return new Promise((resolve) => {
        window.releaseCsv = () => resolve("id,n\n1,eski");
      });
    };
  });
  await page.goto("/metin-veri/");
  await page.locator("#mode").selectOption("csv");
  await page.locator("#file").setInputFiles({
    name: "eski.csv", mimeType: "text/csv", buffer: Buffer.from("x"),
  });
  await page.waitForFunction(() => window.releaseCsv);
  await page.locator("#first").fill("id,n\n2,yeni\n2,yeni");
  await page.evaluate(() => window.releaseCsv());
  await page.locator("#run").click();
  await expect(page.locator("#output")).toHaveValue(/2,yeni/);
});

test("gelecek tarihli kur önbelleği güncel veriyi engellemez", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("dijital-caki-piyasa-fiyatlari-v1", JSON.stringify({
      USD: { buy: 800, sell: 801, time: "2099-01-01T12:00:00+03:00" },
    }));
  });
  await page.route("https://turkishlirarates.com/data/v1/rates.json", (route) => route.fulfill({
    json: {
      market: {
        status: "live", gold_silver: [],
        currencies: [{ code: "USD", buy: 49, sell: 50, time: new Date().toISOString(), fresh: true }],
      },
    },
    headers: { "access-control-allow-origin": "*" },
  }));
  await page.goto("/doviz/");
  await expect(page.locator('[data-rate="USD"] [data-price="sell"]')).toHaveText(/^50,/);
  await page.locator("#rate-unit").selectOption("USD");
  await page.locator("#rate-amount").fill("2");
  await expect(page.locator("#rate-cost")).toHaveText(/^100,00/);
});

test("Türkçe PDF başlığı ve metni EPUB içinde korunur", async ({ page }) => {
  const source = await PDFDocument.create();
  const first = source.addPage();
  first.drawText("Bu kitap test icin hazirlandi. Metin EPUB icinde kalir.", { x: 35, y: 740 });
  source.setTitle("Adsızlığın Kitabı");
  await page.goto("/pdf-epub/");
  await page.locator("#file").setInputFiles({
    name: "belge.pdf", mimeType: "application/pdf", buffer: Buffer.from(await source.save()),
  });
  await expect(page.locator("#m-title")).toHaveValue("Adsızlığın Kitabı");
  await page.locator("#go").click();
  await expect(page.locator("#step-review")).toBeVisible({ timeout: 15_000 });
  const epub = await JSZip.loadAsync(await readFile(await download(page, "#download")));
  expect(await epub.file("mimetype").async("string")).toBe("application/epub+zip");
  expect(await epub.file("OEBPS/content.opf").async("string")).toContain("Adsızlığın Kitabı");
  const chapters = epub.file(/^OEBPS\/bolum.*\.xhtml$/);
  const text = await Promise.all(chapters.map((file) => file.async("string")));
  expect(text.join("\n")).toContain("Metin EPUB icinde kalir.");
});

test("PDF çıktı sırası ve sayfa dönüşü uygulamayı izler", async ({ page }) => {
  const files = [];
  for (const [width, height] of [[300, 500], [320, 440]]) {
    const doc = await PDFDocument.create();
    doc.addPage([width, height]);
    files.push({ name: width + ".pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
  }
  await page.goto("/belge/pdf/");
  await page.locator("#file").setInputFiles(files);
  await expect(page.locator("#download")).toBeEnabled();
  const rows = page.locator("#pages li");
  await rows.last().getByRole("button", { name: "Yukarı" }).click();
  await rows.first().getByRole("button", { name: "Döndür" }).click();
  const pdf = await PDFDocument.load(await readFile(await download(page, "#download")));
  expect(pdf.getPages().map((item) => [item.getWidth(), item.getRotation().angle])).toEqual([
    [320, 90], [300, 0],
  ]);
});

test("kitap kapak değişikliği geri alınabilir ve renkli kapaklar EPUB’a geçer", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/belge/");
  const photos = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = 1450;
    const ctx = canvas.getContext("2d");
    function draw(color, lines, ink) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ink;
      ctx.font = "36px DejaVu Sans";
      lines.forEach((line, index) => ctx.fillText(line, 85, 120 + 65 * index));
      return canvas.toDataURL("image/jpeg", 0.97).split(",")[1];
    }
    return [
      draw("#ca2d28", ["Deneme kitabı"], "white"),
      draw("white", [
        "İstanbul ışıkları gece boyunca parladı.",
        "Çığ düştü, yağmur yağdı ve gökyüzü açıldı.",
        "Şükrü öğüt verdi. Gönül üzüm topladı.",
        "Kâğıt ve rüzgâr unutulmadı.",
      ], "black"),
      draw("#1a47bf", ["Arka kapak yazısı"], "white"),
    ];
  });
  const files = photos.map((photo, index) => ({
    name: `sayfa-${index + 1}.jpg`, mimeType: "image/jpeg", buffer: Buffer.from(photo, "base64"),
  }));

  await page.locator('[data-tab="book"]').click();
  const upload = page.locator("#bk-pick");
  await upload.setInputFiles(files[0]);
  const front = page.getByRole("dialog", { name: "Bu sayfa ön kapak mı?" });
  await expect(front).toBeVisible();
  await page.reload();
  await expect(front).toBeVisible();
  await page.locator("#bk-front-yes").click();
  await expect(page.locator("#bk-pages li:not(.pending)")).toHaveCount(1, { timeout: 20_000 });
  await upload.setInputFiles(files.slice(1));
  await expect(page.locator("#bk-pages li:not(.pending)")).toHaveCount(3, { timeout: 20_000 });

  const back = page.locator("#bk-back");
  const lastPage = page.locator("#bk-pages .num").last();
  await back.click();
  await expect(lastPage).toHaveText("Arka kapak");
  await back.click();
  await expect(lastPage).toHaveText("3");
  await back.click();
  await expect(lastPage).toHaveText("Arka kapak");
  await page.reload();
  await expect(lastPage).toHaveText("Arka kapak");

  const pdf = await PDFDocument.load(await readFile(await download(page, "#bk-pdf")));
  expect(pdf.getPageCount()).toBe(3);
  await page.locator("#bk-epub").click();
  await expect(page).toHaveURL(/\/pdf-epub\/$/);
  await expect(page.locator("#step-opts")).toBeVisible();
  await page.locator("details.adv summary").click();
  await page.locator("#o-mode").selectOption("fast");
  await page.locator("#go").click();
  await expect(page.locator("#step-review")).toBeVisible({ timeout: 30_000 });

  const epub = await JSZip.loadAsync(await readFile(await download(page, "#download")));
  const opf = await epub.file("OEBPS/content.opf").async("string");
  const order = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((item) => item[1]);
  expect(order[0]).toBe("cover");
  expect(order.at(-1)).toBe("back-cover");
  for (const [name, channel] of [["cover.png", 0], ["back-cover.png", 2]]) {
    const data = await epub.file("OEBPS/" + name).async("base64");
    const pixel = await page.evaluate(async (base64) => {
      const blob = await (await fetch("data:image/png;base64," + base64)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      return [...ctx.getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data];
    }, data);
    expect(pixel[channel]).toBeGreaterThan(180);
    expect(pixel[2 - channel]).toBeLessThan(70);
  }
  const chapters = await Promise.all(epub.file(/^OEBPS\/bolum.*\.xhtml$/).map((file) => file.async("string")));
  expect(chapters.join("\n")).toContain("Şükrü öğüt verdi");
});
