import { expect, test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.context().route(/^https?:/, (route) => {
      return new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort();
    });
    await use(page);
    expect(errors, "Tarayıcıda yakalanmamış hata").toEqual([]);
  },
});

export async function download(page, selector) {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(selector).click(),
  ]);
  return file.path();
}
