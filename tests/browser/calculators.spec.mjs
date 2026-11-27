import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

async function expectNoOverflow(page) {
  const sizes = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
}

async function openCalculator(page, id, name) {
  const response = await page.goto("/hesapkitap/?arac=" + id);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator("#calculator")).toBeVisible();
  await expectNoOverflow(page);
}

async function calculate(page, fields) {
  for (const [name, value] of Object.entries(fields)) {
    await page.locator("#field-" + name).fill(value);
  }
  await page.getByRole("button", { name: "Hesapla" }).click();
}

function result(page, label) {
  return page.locator("#result .result-row")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
}

for (const [width, colorScheme] of [[320, "light"], [393, "dark"], [430, "dark"], [768, "light"]]) {
  test(`hesaplama kutuları ${width} px ekranda hizalanır ve aralarında boşluk kalır`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/hesapkitap/");
    const list = page.getByRole("navigation", { name: "Hesaplama araçları" });
    await expect(list.getByRole("link")).toHaveCount(14);
    const routes = await list.getByRole("link").evaluateAll((links) => links.map((link) => link.href));

    for (const route of routes) {
      await test.step(new URL(route).search, async () => {
        await page.goto(route);
        const form = page.locator("#calculator");
        await expect(form).toBeVisible();
        const layout = await form.evaluate((form) => {
          const box = ({ left, top, right, bottom, height, width }) => ({ left, top, right, bottom, height, width });
          return {
            form: box(form.getBoundingClientRect()),
            fields: Array.from(form.querySelectorAll(".field:not([hidden]) > :is(input, select)"),
              (field) => box(field.getBoundingClientRect())),
          };
        });
        expect(layout.fields.length).toBeGreaterThan(0);
        for (const [i, field] of layout.fields.entries()) {
          expect(field.left).toBeGreaterThanOrEqual(layout.form.left - 1);
          expect(field.right).toBeLessThanOrEqual(layout.form.right + 1);
          expect(field.height).toBeCloseTo(layout.fields[0].height, 0);
          if (width <= 480) expect(field.width).toBeCloseTo(layout.form.width, 0);
          for (const previous of layout.fields.slice(0, i)) {
            const gap = Math.max(field.left - previous.right, field.top - previous.bottom);
            expect(gap).toBeGreaterThanOrEqual(8);
            if (field.left > previous.left && field.top < previous.bottom) {
              expect(field.top).toBeCloseTo(previous.top, 0);
            }
          }
        }
        await expectNoOverflow(page);
      });
    }
  });
}

test("eski bağlantılar seçili aracı yeni adreste açar", async ({ page }) => {
  await page.goto("/hesaplama/?arac=yuzde#sonuc");
  await expect(page).toHaveURL(/\/hesapkitap\/\?arac=yuzde#sonuc$/);
  await expect(page.getByRole("heading", { name: "Yüzde Hesaplama", exact: true })).toBeVisible();
});

test("zam, indirim, yüzde ve KDV farklı işlem kiplerinde doğru hesaplanır", async ({ page }) => {
  await test.step("Zam", async () => {
    await openCalculator(page, "zam", "Zam Oranı Hesaplama");
    await calculate(page, { old: "1.234,50", percent: "20" });
    await expect(result(page, "Yeni tutar")).toHaveText("1.481,40 TL");
    await expect(result(page, "Zam tutarı")).toHaveText("246,90 TL");
    await page.locator("#mode").selectOption("ratio");
    await expect(page.locator("#result")).toBeEmpty();
    await calculate(page, { old: "1.000", current: "1.150" });
    await expect(result(page, "Zam oranı")).toHaveText("%15");
  });

  await test.step("İndirim", async () => {
    await openCalculator(page, "indirim", "İndirim Hesaplama");
    await calculate(page, { old: "480", percent: "12,5" });
    await expect(result(page, "İndirimli fiyat")).toHaveText("420,00 TL");
    await expect(result(page, "İndirim tutarı")).toHaveText("60,00 TL");
    await page.locator("#mode").selectOption("original");
    await calculate(page, { current: "420", percent: "12,5" });
    await expect(result(page, "Etiket fiyatı")).toHaveText("480,00 TL");
  });

  await test.step("Yüzde", async () => {
    await openCalculator(page, "yuzde", "Yüzde Hesaplama");
    await calculate(page, { a: "250", b: "12,5" });
    await expect(result(page, "Sonuç")).toHaveText("31,25");
    await page.locator("#mode").selectOption("ratio");
    await calculate(page, { a: "30", b: "0" });
    await expect(page.getByRole("alert")).toHaveText("Bütün sıfır olamaz.");
    await expect(page.locator("#result")).toBeEmpty();
    await calculate(page, { b: "120" });
    await expect(page.locator("#error")).toBeEmpty();
    await expect(result(page, "Yüzde")).toHaveText("%25");
  });

  await test.step("KDV", async () => {
    await openCalculator(page, "kdv", "KDV Hesaplama");
    await calculate(page, { amount: "100" });
    await expect(result(page, "KDV dahil")).toHaveText("120,00 TL");
    await page.locator("#mode").selectOption("gross");
    await calculate(page, { amount: "120" });
    await expect(result(page, "KDV hariç")).toHaveText("100,00 TL");
    await expect(result(page, "KDV tutarı")).toHaveText("20,00 TL");
    await page.locator("#mode").selectOption("tax");
    await calculate(page, { amount: "20" });
    await expect(result(page, "KDV dahil")).toHaveText("120,00 TL");
    await expectNoOverflow(page);
  });
});

test("yaş, gün ve saat hesabı takvim sınırlarını korur", async ({ page }) => {
  await test.step("29 Şubat doğum günü", async () => {
    await openCalculator(page, "yas", "Yaş Hesaplama");
    await calculate(page, { birth: "2000-02-29", asOf: "2023-02-28" });
    await expect(result(page, "Sonraki doğum günü")).toHaveText("1 Mart 2023");
    await expect(result(page, "Kalan süre")).toHaveText("1 gün");
    await calculate(page, { asOf: "2023-03-01" });
    await expect(result(page, "Yaş")).toHaveText("23 yıl, 0 ay, 0 gün");
    await expect(result(page, "Kalan süre")).toHaveText("Bugün");
  });

  await test.step("İki tarih arası", async () => {
    await openCalculator(page, "gun-farki", "İki Tarih Arası");
    await calculate(page, { start: "2024-03-01", end: "2024-03-04" });
    await expect(result(page, "Toplam gün")).toHaveText("3");
    await expect(result(page, "Hafta içi")).toHaveText("1 gün");
    await page.getByRole("checkbox", { name: "Bitiş gününü de say" }).check();
    await calculate(page, {});
    await expect(result(page, "Toplam gün")).toHaveText("4");
    await expect(result(page, "Hafta içi")).toHaveText("2 gün");
  });

  await test.step("Artık yılda bir gün geri", async () => {
    await openCalculator(page, "tarih-ekle", "Tarihe Gün Ekle veya Çıkar");
    await calculate(page, { start: "2024-03-01", days: "-1" });
    await expect(result(page, "Yeni tarih")).toHaveText("29 Şubat 2024");
  });

  await test.step("Gece yarısını geçen süre", async () => {
    await openCalculator(page, "saat-farki", "Saat Farkı");
    await calculate(page, { start: "23:40", end: "01:15" });
    await expect(result(page, "Süre")).toHaveText("1 saat, 35 dakika");
    await expect(result(page, "Toplam dakika")).toHaveText("95");
    await expect(result(page, "Bitiş")).toHaveText("Ertesi gün");
  });
});

test("birim fiyat, yakıt, hesap bölüşme ve orantı sonuçları dar ekrana sığar", async ({ page }) => {
  await test.step("Birim fiyat", async () => {
    await openCalculator(page, "birim-fiyat", "Birim Fiyat Karşılaştırma");
    await page.locator("#field-unit").selectOption("kg");
    await calculate(page, { priceA: "90", quantityA: "0,75", priceB: "140", quantityB: "1,25" });
    await expect(result(page, "1. ürün")).toHaveText("120,0000 TL / kg");
    await expect(result(page, "2. ürün")).toHaveText("112,0000 TL / kg");
    await expect(result(page, "Karşılaştırma")).toHaveText("2. ürün daha uygun");
    await expectNoOverflow(page);
  });

  await test.step("Yakıt", async () => {
    await openCalculator(page, "yakit", "Yakıt Maliyeti");
    await calculate(page, { distance: "250", consumption: "6,5", price: "40" });
    await expect(result(page, "Yakıt maliyeti")).toHaveText("650,00 TL");
    await expect(result(page, "Yakıt miktarı")).toHaveText("16,25 L");
    await expect(result(page, "Kilometre başına")).toHaveText("2,6000 TL");
    await expectNoOverflow(page);
  });

  await test.step("Hesap bölüşme", async () => {
    await openCalculator(page, "hesap-bolus", "Hesap Bölüşme");
    await calculate(page, { amount: "100", tip: "10", people: "3" });
    await expect(result(page, "Toplam")).toHaveText("110,00 TL");
    await expect(result(page, "Bahşiş")).toHaveText("10,00 TL");
    await expect(result(page, "Kişi başı dağılım")).toHaveText("2 kişi 36,67 TL, 1 kişi 36,66 TL");
    await expectNoOverflow(page);
  });

  await test.step("Doğru orantı", async () => {
    await openCalculator(page, "oran", "Oran Orantı");
    await calculate(page, { a: "12", b: "30", c: "18" });
    await expect(result(page, "Yeni miktarın karşılığı")).toHaveText("45");
    await expectNoOverflow(page);
  });
});
