import { expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { test } from "./fixtures.mjs";

test("arşivden Türkçe adlı tek dosya çıkarılır", async ({ page }) => {
  const zip = "UEsDBBQAAAgAAGuoel2y7va+CwAAAAsAAAAQAAAAa2xhc8O2ci/Dp2F5LnR4dMOnYXkgaGF6xLFyUEsBAhQDFAAACAAAa6h6XbLu9r4LAAAACwAAABAAAAAAAAAAAAAAAIABAAAAAGtsYXPDtnIvw6dheS50eHRQSwUGAAAAAAEAAQA+AAAAOQAAAAAA";
  await page.goto("/dosya/arsiv/");
  await page.locator("#archive-file").setInputFiles({ name: "ornek.zip", mimeType: "application/zip", buffer: Buffer.from(zip, "base64") });
  const extract = page.getByRole("button", { name: "çay.txt dosyasını çıkar" });
  await expect(extract).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), extract.click()]);
  expect(download.suggestedFilename()).toBe("çay.txt");
  expect(await readFile(await download.path(), "utf8")).toBe("çay hazır");
});

test("tarif kesirleri ölçeklenir ve kayıt sayfa yenilenince geri gelir", async ({ page }) => {
  await page.goto("/ev/tarif/");
  await page.locator("#title").fill("Kek");
  await page.locator("#ingredients").fill("1½ su bardağı süt\n1/2 kaşık tuz\n2–4 yumurta\nTadına göre şeker");
  await page.locator("#servings").fill("2");
  const preview = page.locator("#ingredient-view");
  await expect(preview).toContainText("0,75 su bardağı süt");
  await expect(preview).toContainText("0,25 kaşık tuz");
  await expect(preview).toContainText("1–2 yumurta");
  await expect(preview).toContainText("Tadına göre şeker");
  await preview.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Tarifi kaydet" }).click();
  await page.reload();
  await page.locator("#recipes").selectOption({ label: "Kek" });
  await expect(preview).toContainText("0,75 su bardağı süt");
});

test("oda planı kapı alanını denetler ve PNG verir", async ({ page }) => {
  await page.goto("/ev/yerlesim/");
  const doorWidth = await page.locator("#door-width").boundingBox();
  const doorOffset = await page.getByLabel("Kapı konumu (cm)").boundingBox();
  expect(doorOffset?.y).toBe(doorWidth?.y);
  await page.getByRole("button", { name: "Mobilyayı ekle" }).click();
  await expect(page.getByRole("status")).toContainText("bu konuma sığıyor");
  await page.locator("#item-x").fill("20");
  await page.locator("#item-y").fill("220");
  await page.locator("#item-y").press("Tab");
  await expect(page.getByRole("status")).toContainText("kapının açılma alanına giriyor");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PNG indir" }).click()]);
  expect((await readFile(await download.path())).subarray(1, 4).toString()).toBe("PNG");
});

test("gece vardiyası ertesi gün biter ve izin günü dışa aktarılmaz", async ({ page }) => {
  await page.goto("/plan/vardiya/");
  await page.locator("#start").fill("2026-11-28");
  await page.locator("#days").fill("2");
  await page.locator("#cycle").fill("N İ");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Takvim dosyasını indir" }).click()]);
  const content = await readFile(await download.path(), "utf8");
  expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(content).toContain("DTSTART:20261128T170000Z");
  expect(content).toContain("DTEND:20261129T050000Z");
});

test("vardiya alanları dar ekranda hizalanır ve tüm günler dışa aktarılır", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/plan/vardiya/");
  await page.locator("#start").fill("2026-11-27");
  await page.locator("#days").fill("14");
  await page.locator("#cycle").fill("G İ");
  await page.getByText("Vardiya saatleri", { exact: true }).click();
  const aligned = await page.evaluate(() => {
    const boxes = (selector) => [...document.querySelectorAll(selector)].map(node => node.getBoundingClientRect());
    const rows = boxes("#preview select");
    const noOverlap = (rects) => rects[0].right < rects[1].left && rects[0].height === rects[1].height;
    return document.documentElement.scrollWidth === innerWidth &&
      noOverlap(boxes(".shift-fields input")) && noOverlap(boxes(".shift-hours input").slice(0, 2)) &&
      rows.every(rect => rect.left === rows[0].left && rect.width === rows[0].width);
  });
  expect(aligned).toBe(true);
  await expect(page.locator("#preview li")).toHaveCount(7);
  await page.getByRole("button", { name: "Sonraki yedi gün" }).click();
  await expect(page.locator("#day-range")).toHaveText("8–14 / 14 gün");
  await page.locator("#preview select").first().selectOption("N");
  await expect(page.locator("#preview li").first()).toContainText("20:00–08:00");
  await page.getByRole("button", { name: "Önceki yedi gün" }).click();
  await expect(page.locator("#day-range")).toHaveText("1–7 / 14 gün");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Takvim dosyasını indir" }).click()]);
  expect((await readFile(await download.path(), "utf8")).match(/BEGIN:VEVENT/g)).toHaveLength(8);
});

test("mobilya oda sınırında kalır ve 3D görünüm döndürülebilir", async ({ page }) => {
  await page.goto("/ev/yerlesim/");
  await page.getByRole("button", { name: "Mobilyayı ekle" }).click();
  const canvas = page.locator("#room");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 2, bounds.y + bounds.height - 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator("#item-x")).toHaveValue("210");
  await expect(page.locator("#item-y")).toHaveValue("245");
  await page.locator("#item-x").fill("-80");
  await page.locator("#item-x").press("Tab");
  await expect(page.locator("#item-x")).toHaveValue("0");
  await page.getByRole("button", { name: "90° döndür" }).click();
  await expect(page.locator("#item-y")).toHaveValue("120");
  const flat = await canvas.evaluate(node => node.toDataURL());
  await page.getByRole("button", { name: "3D önizleme" }).click();
  await expect(canvas).toHaveAccessibleName(/üç boyutlu/);
  const front = await canvas.evaluate(node => node.toDataURL());
  expect(front).not.toBe(flat);
  await page.getByRole("button", { name: "Görünümü döndür" }).click();
  const turned = await canvas.evaluate(node => node.toDataURL());
  expect(turned).not.toBe(front);
  await page.locator("#item-elevation").fill("125");
  await page.locator("#item-elevation").press("Tab");
  expect(await canvas.evaluate(node => node.toDataURL())).not.toBe(turned);
  await page.reload();
  await page.getByRole("button", { name: "3D önizleme" }).click();
  await expect(page.locator("#item-elevation")).toHaveValue("125");
});

test("mobilya 3D önizlemede dört açıdan sürüklenir ve köşede kalır", async ({ page }) => {
  await page.goto("/ev/yerlesim/");
  await page.getByRole("button", { name: "Mobilyayı ekle" }).click();
  const preview = page.getByRole("button", { name: "3D önizleme" });
  const turn = page.getByRole("button", { name: "Görünümü döndür" });
  const canvas = page.locator("#room");
  const x = page.locator("#item-x");
  const y = page.locator("#item-y");

  for (const [angle, [expectedX, expectedY]] of [[210, 245], [210, 0], [0, 0], [0, 245]].entries()) {
    await x.fill("105");
    await y.fill("123");
    await y.press("Tab");
    await preview.click();
    if (angle) await turn.click();
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    const center = bounds.x + bounds.width / 2;
    await page.mouse.move(center, bounds.y + bounds.height * .46);
    await page.mouse.down();
    await page.mouse.move(center, bounds.y + bounds.height - 3, { steps: 5 });
    await page.mouse.up();
    await preview.click();
    await expect(x).toHaveValue(String(expectedX));
    await expect(y).toHaveValue(String(expectedY));
  }
  await page.reload();
  await expect(x).toHaveValue("0");
  await expect(y).toHaveValue("245");
});

test("kutu araması Türkçe metni bulur ve etiket orijinal içeriği taşır", async ({ page }) => {
  await page.goto("/ev/araclar/?arac=kutu");
  await page.getByLabel("Kutu kodu").fill("MUTFAK-03");
  await page.getByLabel("Oda", { exact: true }).fill("Mutfak");
  await page.getByLabel("İçindekiler").fill("Kahve değirmeni\nKupalar");
  await page.getByRole("button", { name: "Kutuyu kaydet" }).click();
  await expect(page.getByRole("status")).toHaveText("Kayıt saklandı.");
  await page.reload();
  const search = page.getByRole("searchbox");
  await search.fill("degirmeni");
  await expect(page.locator("#records")).toContainText("MUTFAK-03");
  await page.evaluate(() => { window.print = () => { window.printedLabel = document.getElementById("print-label").textContent; }; });
  await page.getByRole("button", { name: "Etiketi yazdır" }).click();
  expect(await page.evaluate(() => window.printedLabel)).toContain("Kahve değirmeni");
  await search.fill("bulunmayacak");
  await expect(page.locator("#records")).toHaveText("Eşleşen kayıt bulunamadı.");
});

test("garanti eki yenilemeden sonra ZIP ve takvim dosyasıyla alınır", async ({ page }) => {
  await page.goto("/ev/araclar/?arac=garanti");
  await page.getByLabel("Ürün adı").fill("Çamaşır makinesi");
  await page.getByLabel("Seri numarası").fill("00123");
  await page.getByLabel("Garanti bitişi").fill("2027-02-08");
  await page.locator('[name="attachment"]').setInputFiles({
    name: "fiş.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nörnek"),
  });
  await page.getByRole("button", { name: "Ürünü kaydet" }).click();
  await expect(page.getByRole("status")).toHaveText("Kayıt saklandı.");
  await page.reload();
  await expect(page.getByRole("button", { name: "Fişi indir" })).toBeVisible();
  const [ics] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Takvim dosyası" }).click()]);
  expect(await readFile(await ics.path(), "utf8")).toContain("DTSTART;VALUE=DATE:20270208");
  expect(await readFile(await ics.path(), "utf8")).toContain("TRIGGER:-P7D");
  const [zip] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Garanti ZIP’i" }).click()]);
  const zipBytes = await readFile(await zip.path());
  expect(zipBytes.subarray(0, 4)).toEqual(Buffer.from([80, 75, 3, 4]));
  expect(zipBytes.includes(Buffer.from("fis-fiş.pdf"))).toBe(true);
});

test("boya hesabı kapıları düşer ve kutuları en az artana göre seçer", async ({ page }) => {
  await page.goto("/ev/araclar/?arac=boya");
  for (const [label, value] of [["Oda eni (m)", "4"], ["Oda boyu (m)", "5"], ["Duvar yüksekliği (m)", "3"],
    ["Kapı ve pencere (m²)", "4"], ["Kat sayısı", "1"], ["Ek pay (%)", "0"], ["Kutu boyları (L)", "3 5 9"]]) {
    await page.getByLabel(label).fill(value);
  }
  await page.getByRole("button", { name: "Hesapla" }).click();
  await expect(page.locator("#paint-summary")).toContainText("50 m² net duvar · 5 L boya gerekli");
  await expect(page.locator("#paint-cans")).toHaveText("1 × 5 L");
  await page.getByLabel("Kapı ve pencere (m²)").fill("60");
  await page.getByRole("button", { name: "Hesapla" }).click();
  await expect(page.getByRole("status")).toContainText("toplam duvar alanından küçük olmalı");
  await expect(page.locator("#paint-result")).toBeHidden();
});

test("sayaç farklı tarihlerdeki okumaları karşılaştırır ve CSV verir", async ({ page }) => {
  await page.goto("/ev/araclar/?arac=sayac");
  const add = async (day, reading) => {
    await page.getByRole("combobox", { name: "Sayaç türü", exact: true }).selectOption("water");
    await page.getByLabel("Okuma tarihi").fill(day);
    await page.getByLabel("Sayaç adı").fill("Ev");
    await page.getByLabel("Endeks (m³)").fill(reading);
    await page.getByRole("button", { name: "Okumayı kaydet" }).click();
    await expect(page.getByRole("status")).toHaveText("Kayıt saklandı.");
    await expect(page.getByRole("combobox", { name: "Sayaç türü", exact: true })).toHaveValue("electric");
  };
  await add("2026-12-01", "112.5");
  await add("2026-11-01", "100");
  await add("2027-01-01", "0");
  await page.reload();
  await expect(page.locator("#records")).toContainText("Tüketim · 12,5 m³");
  await expect(page.locator("#records")).toContainText("Endeks düşmüş.");
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "CSV indir" }).click()]);
  expect(await readFile(await file.path(), "utf8")).toContain('"2026-12-01";"112,5";"12,5";"m³"');
});

test("mobilya modeli değiştirilince iki görünüm güncellenir ve seçim saklanır", async ({ page }) => {
  await page.goto("/ev/yerlesim/");
  await page.getByRole("button", { name: "Mobilyayı ekle" }).click();
  const model = page.getByLabel("Seçili mobilya modeli");
  const canvas = page.locator("#room");
  const snapshot = () => canvas.evaluate(node => node.toDataURL());
  const flat = await snapshot();
  await model.selectOption("bed");
  expect(await snapshot()).not.toBe(flat);
  await page.getByRole("button", { name: "3D önizleme" }).click();
  const bed = await snapshot();
  await model.selectOption("tv");
  expect(await snapshot()).not.toBe(bed);
  await page.reload();
  await expect(model).toHaveValue("tv");
});

test("eski Tarif Kartı bağlantısı yeni konumda aynı kayıtları açar", async ({ page }) => {
  await page.goto("/ev/tarif/");
  await page.evaluate(() => localStorage.setItem("dijital-caki-tarifler-1",
    JSON.stringify([{ id: "eski", title: "Eski kek", base: 4, servings: 4, ingredients: "100 g un", steps: "", source: "" }])));
  await page.goto("/mutfak/tarif/");
  await expect(page).toHaveURL(/\/ev\/tarif\/$/);
  await page.locator("#recipes").selectOption({ label: "Eski kek" });
  await expect(page.locator("#ingredient-view")).toContainText("100 g un");
});

test("eşya kataloğu Türkçe arama yapar ve modelin değiştirilebilir ölçülerini doldurur", async ({ page }) => {
  await page.goto("/ev/yerlesim/");
  await expect(page.locator("#new-model optgroup")).toHaveCount(8);
  expect(await page.locator("#new-model optgroup option").count()).toBeGreaterThan(100);
  const search = page.getByRole("searchbox", { name: "Eşya ara" });
  await search.fill("cerceve");
  await expect(page.locator("#catalog-info")).toContainText("1 eşya bulundu");
  await search.press("Enter");
  await expect(page.locator("#new-model")).toHaveValue("picture");
  await expect(page.locator("#name")).toHaveValue("Duvar tablosu");
  await expect(page.locator("#height")).toHaveValue("5");
  await expect(page.locator("#base-new")).toHaveValue("145");
  await page.locator("#width").fill("64");
  await page.getByRole("button", { name: "Mobilyayı ekle" }).click();
  await page.getByRole("button", { name: "3D önizleme" }).click();
  await expect(page.locator("#item-elevation")).toHaveValue("55");
  await expect(page.locator("#item-base")).toHaveValue("145");
  await page.reload();
  await expect(page.locator("#item-model")).toHaveValue("picture");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dijital-caki-oda-1")).items[0]);
  expect(saved.width).toBe(64);
  await search.fill("tv");
  await page.locator("#new-model").selectOption("wall-tv");
  await expect(page.locator("#base-new")).toHaveValue("105");
  await expect(page.locator("#name")).toHaveValue("Duvar tipi televizyon");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});

test("halı mobilyanın altında kalır ve L koltuğun boş köşesi çakışmaz", async ({ page }) => {
  await page.goto("/ev/yerlesim/");
  await page.evaluate(() => {
    const items = [
      { id: "sofa", name: "L koltuk", model: "sectional", x: 50, y: 60, width: 250, height: 175, elevation: 85 },
      { id: "rug", name: "Halı", model: "rug", x: 25, y: 35, width: 290, height: 250, elevation: 2 },
      { id: "table", name: "Sehpa", model: "coffee-table", x: 85, y: 155, width: 65, height: 45, elevation: 43 },
    ];
    localStorage.setItem("dijital-caki-oda-1", JSON.stringify({ width: 440, height: 360, offset: 0, door: 0, items }));
  });
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Sehpa bu konuma sığıyor.");
  await page.locator("#item-x").fill("210");
  await page.locator("#item-x").press("Tab");
  await expect(page.getByRole("status")).toContainText("başka bir mobilyayla örtüşüyor");
});
