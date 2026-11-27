import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

async function expectFieldsClear(page) {
  const issues = await page.locator("form").evaluate(form => {
    const container = form.getBoundingClientRect();
    const fields = [...form.querySelectorAll("input, select, button")].filter(field => field.checkVisibility())
      .map(field => field.getBoundingClientRect());
    return fields.flatMap((box, index) => {
      const outside = box.right > container.right + 1 || box.left < container.left - 1;
      const overlap = fields.slice(index + 1).some(other =>
        Math.min(box.right, other.right) - Math.max(box.left, other.left) > 1 &&
        Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) > 1);
      return outside || overlap ? [index] : [];
    });
  });
  expect(issues, "Form alanları ve düğmeleri birbirine değmeden sığmalı").toEqual([]);
}

for (const width of [320, 393, 430, 768]) {
  test(`yeni araçların hesapları ve alanları ${width} px ekranda doğrulanır`, async ({ page }) => {
    test.setTimeout(55_000);
    await page.setViewportSize({ width, height: 820 });
    await page.emulateMedia({ colorScheme: width === 393 || width === 430 ? "dark" : "light" });
    const run = () => page.getByRole("button", { name: "Hesapla", exact: true }).click();

    await test.step("Desi", async () => {
      await page.goto("/hesapkitap/?arac=desi");
      await expect(page.getByRole("heading", { name: "Kargo Desisi" })).toBeVisible();
      await page.locator("#field-width").fill("40");
      await page.locator("#field-length").fill("30");
      await page.locator("#field-height").fill("20");
      await run();
      await expect(page.locator("#result")).toContainText("8 desi");
      await expect(page.locator("#result")).toContainText("24 L");
      await page.locator("#field-divisor").fill("4.000");
      await run();
      await expect(page.locator("#result")).toContainText("6 desi");
      await expectFieldsClear(page);
    });

    await test.step("Ekran ölçüsü ve oda planı", async () => {
      await page.goto("/hesapkitap/?arac=ekran-olcusu");
      await page.locator("#field-diagonal").fill("55");
      await run();
      await expect(page.locator("#result")).toContainText("121,76 cm");
      await expect(page.locator("#result")).toContainText("68,49 cm");
      await expectFieldsClear(page);
      await page.getByRole("link", { name: "Oda planında aç" }).click();
      await expect(page.locator("#new-model")).toHaveValue("television");
      await expect(page.locator("#width")).toHaveValue("122");
      await expect(page.locator("#height-new")).toHaveValue("69");
      await expect(page.locator("#items")).toBeDisabled();
    });

    await test.step("Fotoğraf baskısı", async () => {
      await page.goto("/foto/baski-boyutu/");
      const picture = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 3000;
        canvas.height = 2000;
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await page.locator("#image").setInputFiles({ name: "örnek.png", mimeType: "image/png", buffer: Buffer.from(picture, "base64") });
      await expect(page.getByRole("status")).toHaveText("Baskı boyutu 25,4 × 16,93 cm.");
      await expect(page.locator("#width")).toHaveValue("3000");
      await expectFieldsClear(page);
      await page.locator("#mode").selectOption("pixels");
      await expect(page.locator("#image")).toBeHidden();
      await page.locator("#width").fill("10,5");
      await page.locator("#height").fill("15");
      await run();
      await expect(page.getByRole("status")).toHaveText("Gerekli piksel ölçüsü 1.241 × 1.772 px.");
      await expectFieldsClear(page);
    });

    await test.step("Metrekare ve malzeme paketi", async () => {
      await page.goto("/ev/metrekare/");
      await page.getByRole("button", { name: "Alan ekle" }).click();
      await page.locator('[name="width"]').nth(0).fill("2");
      await page.locator('[name="length"]').nth(0).fill("3");
      await page.locator('[name="width"]').nth(1).fill("2,5");
      await page.locator('[name="length"]').nth(1).fill("2");
      await page.locator('[name="waste"]').fill("10");
      await page.locator('[name="coverage"]').fill("1,1");
      await run();
      const result = page.getByRole("status");
      await expect(result).toContainText("Toplam alan 11 m²");
      await expect(result).toContainText("Fire dahil alan 12,1 m²");
      await expect(result).toContainText("Gerekli paket 11");
      await expectFieldsClear(page);
      await page.getByRole("button", { name: "Alan 2 kaldır" }).click();
      await run();
      await expect(result).toContainText("Toplam alan 6 m²");
      await expect(result).toContainText("Gerekli paket 6");
    });

    await test.step("Planlama, ileri ve geri iş günü", async () => {
      await page.goto("/plan/vardiya/");
      await page.getByRole("link", { name: "İş Günü Hesabı" }).click();
      await page.locator("#start").fill("2026-11-27");
      await page.locator("#days").fill("5");
      await run();
      await expect(page.getByRole("status")).toContainText("4 Aralık 2026");
      await page.getByText("Sayılmayacak tatiller", { exact: true }).click();
      await page.locator("#holiday").fill("2026-11-30");
      await page.getByRole("button", { name: "Ekle", exact: true }).click();
      await page.locator("#holiday").fill("2026-12-04");
      await page.getByRole("button", { name: "Ekle", exact: true }).click();
      await run();
      await expect(page.getByRole("status")).toContainText("8 Aralık 2026");
      await expectFieldsClear(page);
      await page.getByRole("button", { name: /30 Kasım 2026.*tatilini kaldır/ }).click();
      await page.locator("#start").fill("2026-12-06");
      await page.locator("#days").fill("1");
      await page.locator("#direction").selectOption("-1");
      await run();
      await expect(page.getByRole("status")).toContainText("3 Aralık 2026");
    });
  });
}
