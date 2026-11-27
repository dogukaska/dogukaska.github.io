import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const origin = process.env.DK_PLIK_URL;
const token = process.env.DK_PLIK_TOKEN;

test.skip(!origin || !token, "Plik integration requires a test Plik server and API token");

for (const days of [3, 7]) {
  test(`Plik ile ${days} günlük gönderi yüklenir, hesapsız indirilir ve silinir`, async ({ browser, page, request }) => {
    const denied = await request.post(`${origin}/upload`, { data: { ttl: days * 86400 } });
    expect(denied.ok()).toBe(false);
    await page.goto("/dosya/paylas/");
    await page.getByLabel("Plik sunucusu").fill(origin);
    await page.getByLabel("Plik API anahtarı").fill(token);
    const photo = Buffer.from([255, 216, 4, 192, 0, 255, 217]);
    const firstName = "İğdır 2026 #1.jpg";
    await page.getByLabel("Dosyalar", { exact: true }).setInputFiles([
      { name: firstName, mimeType: "image/jpeg", buffer: photo },
      { name: "not.txt", mimeType: "text/plain", buffer: Buffer.from("Çekim notu") },
    ]);
    await page.getByLabel("Saklama süresi").selectOption(String(days));
    await page.getByRole("button", { name: "Bağlantı oluştur" }).click();
    await expect(page.locator("#send-status")).toContainText("Bağlantı hazır");
    const share = await page.getByLabel("Paylaşım bağlantısı").inputValue();
    expect(share).not.toContain(token);
    const id = new URLSearchParams(new URL(share).hash.slice(1)).get("gonderi");
    const transfer = await (await request.get(`${origin}/upload/${id}`)).json();
    expect(transfer.ttl).toBe(days * 86400);
    expect(transfer.uploadToken).toBeUndefined();
    expect(Date.parse(transfer.expireAt) - Date.parse(transfer.createdAt)).toBe(days * 86_400_000);
    const anonymousDelete = await request.delete(`${origin}/upload/${id}`);
    expect(anonymousDelete.ok()).toBe(false);

    const recipient = await browser.newContext({ acceptDownloads: true });
    try {
      const mobile = await recipient.newPage();
      await mobile.setViewportSize({ width: 320, height: 820 });
      await mobile.goto(share);
      await expect(mobile.getByLabel("Plik API anahtarı")).toBeHidden();
      await mobile.getByRole("button", { name: "Dosyaları göster" }).click();
      const downloadLink = mobile.getByRole("link", { name: `${firstName} dosyasını indir` });
      await expect(downloadLink).toBeVisible();
      const [download] = await Promise.all([mobile.waitForEvent("download"), downloadLink.click()]);
      expect(await readFile(await download.path())).toEqual(photo);
      expect(mobile.url()).toBe(share);
      const [zip] = await Promise.all([
        mobile.waitForEvent("download"),
        mobile.getByRole("link", { name: "Tümünü ZIP olarak indir" }).click(),
      ]);
      expect((await readFile(await zip.path())).subarray(0, 4)).toEqual(Buffer.from([80, 75, 3, 4]));

      await page.reload();
      await page.getByLabel("Plik API anahtarı").fill(token);
      await page.getByText("Bu tarayıcıdaki gönderiler").click();
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: `Gönderiyi sil (${id.slice(-5)})` }).click();
      await expect(page.locator("#send-status")).toContainText("Gönderi kaldırıldı.");
      await mobile.reload();
      await mobile.getByRole("button", { name: "Dosyaları göster" }).click();
      await expect(mobile.locator("#receive-status")).toContainText("Gönderi silinmiş");
    } finally {
      await recipient.close();
      await request.delete(`${origin}/upload/${id}`, { headers: { "X-PlikToken": token } });
    }
  });
}

test("Plik büyük gönderi boyutunu kabul eder ve iptal edilen gönderiyi kaldırır", async ({ page, request }) => {
  const headers = { "X-PlikToken": token };
  const large = await request.post(`${origin}/upload`, {
    headers,
    data: { ttl: 259200, files: [{ fileName: "çekim.zip", fileSize: 10_500_000_000 }] },
  });
  expect(large.ok()).toBe(true);
  const draft = await large.json();
  expect(draft.files[0].fileSize).toBe(10_500_000_000);
  await request.delete(`${origin}/upload/${draft.id}`, { headers });

  await page.route(`${origin}/file/**`, async (route) => {
    if (route.request().method() === "POST") return;
    await route.continue();
  });
  await page.goto("/dosya/paylas/");
  await page.getByLabel("Plik sunucusu").fill(origin);
  await page.getByLabel("Plik API anahtarı").fill(token);
  await page.getByLabel("Dosyalar", { exact: true }).setInputFiles({
    name: "çekim.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("deneme"),
  });
  const creating = page.waitForResponse((response) => response.url() === `${origin}/upload`
    && response.request().method() === "POST");
  const sending = page.waitForRequest((upload) => upload.url().startsWith(`${origin}/file/`)
    && upload.method() === "POST");
  await page.getByRole("button", { name: "Bağlantı oluştur" }).click();
  const transfer = await (await creating).json();
  await sending;
  try {
    await page.getByRole("button", { name: "İptal et" }).click();
    await expect(page.locator("#send-status")).toHaveText("Yükleme iptal edildi.");
    await expect(page.getByLabel("Paylaşım bağlantısı")).toBeHidden();
    expect((await request.get(`${origin}/upload/${transfer.id}`)).status()).toBe(404);
  } finally {
    await request.delete(`${origin}/upload/${transfer.id}`, { headers });
  }
});
