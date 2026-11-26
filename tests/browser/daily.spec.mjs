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
  await page.goto("/mutfak/tarif/");
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
