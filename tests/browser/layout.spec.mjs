import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

for (const [width, colorScheme] of [[320, "light"], [393, "dark"], [430, "dark"], [768, "light"]]) {
  test(`katalog ve araçlarda kutular ${width} px genişlikte çakışmaz`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const entries = await page.evaluate(async () => {
      const { CATEGORIES } = await import("/apps.js");
      return ["/", ...new Set(CATEGORIES.flatMap(({ apps }) => apps.map(({ url }) => url))), "/metin-veri/"];
    });
    const problems = [];

    for (const route of entries) {
      await test.step(route, async () => {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        if (!response?.ok()) {
          problems.push(`${route} HTTP ${response?.status()}`);
          return;
        }
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        });
        const problemsOnPage = await page.evaluate(() => {
          const root = document.documentElement;
          const issues = [];
          if (root.scrollWidth > root.clientWidth + 1) {
            issues.push(`yatay taşma ${root.scrollWidth} / ${root.clientWidth}`);
          }
          const footer = document.querySelector(".catalog-footer-content");
          if (footer) {
            const note = footer.querySelector("p");
            const link = footer.querySelector("a");
            const text = document.createRange();
            text.selectNodeContents(note);
            const textBoxes = text.getClientRects();
            const noteBox = note.getBoundingClientRect();
            const linkBox = link.getBoundingClientRect();
            if (textBoxes.length !== 1 || Math.abs(noteBox.top - linkBox.top) > 1
              || linkBox.left - noteBox.right < 6 || linkBox.right > footer.getBoundingClientRect().right + 1) {
              issues.push("Alt bilgi metni ve GitHub bağlantısı tek satıra sığmıyor");
            }
          }
          const visible = Array.from(document.querySelectorAll("input, select, textarea, button, [role=button]"))
            .map((element) => ({ element, box: element.getBoundingClientRect() }))
            .filter(({ element, box }) => box.width >= 4 && box.height >= 4
              && !element.closest("[inert], [aria-hidden=true]")
              && element.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
          const name = ({ element }) => element.id || element.name || element.getAttribute("aria-label")
            || element.textContent.trim() || element.tagName.toLowerCase();
          for (const [index, first] of visible.entries()) {
            for (const second of visible.slice(index + 1)) {
              if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
              const horizontal = Math.min(first.box.right, second.box.right) - Math.max(first.box.left, second.box.left);
              const vertical = Math.min(first.box.bottom, second.box.bottom) - Math.max(first.box.top, second.box.top);
              if (horizontal > 2 && vertical > 2) {
                issues.push(`${name(first)} / ${name(second)} ${Math.round(horizontal)}×${Math.round(vertical)} px`);
              }
            }
          }
          return issues;
        });
        problems.push(...problemsOnPage.map((problem) => `${route} ${problem}`));
      });
    }
    expect(problems).toEqual([]);
  });
}
