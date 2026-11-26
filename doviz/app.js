const endpoint = "https://turkishlirarates.com/data/v1/rates.json";
const refreshInterval = 60_000;
const maxPriceAge = 45 * 60_000;
const storageKey = "dijital-caki-piyasa-fiyatlari-v1";
const timezone = "Europe/Istanbul";
const priceFormat = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2, maximumFractionDigits: 4,
});
const totalFormat = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const clockFormat = new Intl.DateTimeFormat("tr-TR", {
  timeZone: timezone, timeStyle: "short",
});
const dateTimeFormat = new Intl.DateTimeFormat("tr-TR", {
  timeZone: timezone, dateStyle: "short", timeStyle: "short",
});
const dateFormat = new Intl.DateTimeFormat("tr-TR", { timeZone: timezone, dateStyle: "short" });
const status = document.getElementById("rates-status");
const rows = [
  { code: "XAU_GRAM", group: "gold_silver" },
  { code: "USD", group: "currencies" },
  { code: "EUR", group: "currencies" },
  { code: "GBP", group: "currencies" },
];
const amount = document.getElementById("rate-amount");
const unit = document.getElementById("rate-unit");
const cost = document.getElementById("rate-cost");
const value = document.getElementById("rate-value");
const converterNote = document.getElementById("converter-note");
for (const row of rows) {
  const el = document.querySelector(`[data-rate="${row.code}"]`);
  row.buy = el.querySelector('[data-price="buy"]');
  row.sell = el.querySelector('[data-price="sell"]');
  row.time = el.querySelector("time");
  row.note = el.querySelector(".rate-note");
}

function validPrice(item) {
  const time = typeof item?.time === "string" ? Date.parse(item.time) : NaN;
  return Number.isFinite(time) && time <= Date.now() + refreshInterval &&
    Number.isFinite(item.buy) && item.buy > 0 && Number.isFinite(item.sell) && item.sell >= item.buy;
}

let cached = {};
try { cached = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
for (const row of rows) {
  if (validPrice(cached[row.code])) row.last = cached[row.code];
}

function renderConverter(loading = false) {
  const input = amount.value.trim();
  const quantity = /^\d+(?:[.,]\d+)?$/.test(input) ? Number(input.replace(",", ".")) : NaN;
  const row = rows.find(row => row.code === unit.value);
  const quote = row?.last;
  const costAmount = quantity * quote?.sell;
  const valueAmount = quantity * quote?.buy;
  const canConvert = Number.isFinite(costAmount) && Number.isFinite(valueAmount);
  cost.value = canConvert ? totalFormat.format(costAmount) + " TL" : "—";
  value.value = canConvert ? totalFormat.format(valueAmount) + " TL" : "—";
  let note = "";
  if (input && !Number.isFinite(quantity)) note = "Geçerli bir miktar gir.";
  else if (input && !quote && !loading) note = "Hesaplama için fiyat alınamadı.";
  else if (input && quote && !canConvert) note = "Daha küçük bir miktar gir.";
  else if (canConvert && !row.current) note = "Son alınan fiyatla hesaplandı.";
  if (converterNote.textContent !== note) converterNote.textContent = note;
  converterNote.hidden = !note;
}

function render(loading = false) {
  const any = rows.some(row => row.last);
  const today = dateFormat.format(Date.now());
  status.textContent = any ? "" : loading ? "Fiyatlar yükleniyor…" : "Fiyat şu anda alınamıyor";
  status.hidden = any;
  for (const row of rows) {
    const price = row.last;
    row.buy.textContent = price ? priceFormat.format(price.buy) + " TL" : "—";
    row.sell.textContent = price ? priceFormat.format(price.sell) + " TL" : "—";
    row.time.hidden = !price;
    if (price) {
      const date = new Date(price.time);
      row.time.dateTime = price.time;
      row.time.textContent = (dateFormat.format(date) === today ? clockFormat : dateTimeFormat).format(date) + " TSİ";
    }
    const note = price ? (row.current ? "" : "Son alınan fiyat") : any ? "Fiyat şu anda alınamıyor" : "";
    if (row.note.textContent !== note) row.note.textContent = note;
    row.note.hidden = !note;
  }
  renderConverter(loading);
}

let timer, lastAttempt = -Infinity, inFlight = false;

function schedule() {
  clearTimeout(timer);
  if (document.hidden || inFlight) return;
  const remaining = refreshInterval - (Date.now() - lastAttempt);
  if (remaining <= 0) refresh();
  else timer = setTimeout(refresh, remaining);
}

async function refresh() {
  if (document.hidden || inFlight) return;
  inFlight = true;
  lastAttempt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(endpoint, { cache: "no-cache", signal: controller.signal });
    if (!response.ok) throw new Error("Fiyat yanıtı başarısız");
    const { market } = await response.json();
    const next = {};
    for (const row of rows) {
      const group = market?.[row.group];
      const item = Array.isArray(group) ? group.find(item => item?.code === row.code) : null;
      const isLatest = validPrice(item) && (!row.last || Date.parse(item.time) >= Date.parse(row.last.time));
      if (isLatest) row.last = { buy: item.buy, sell: item.sell, time: item.time };
      const age = isLatest ? Date.now() - Date.parse(item.time) : Infinity;
      row.current = Boolean(isLatest && item.fresh === true && market.status === "live" &&
        age >= -refreshInterval && age <= maxPriceAge);
      if (row.last) next[row.code] = row.last;
    }
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  } catch {
    for (const row of rows) row.current = false;
  } finally {
    clearTimeout(timeout);
    inFlight = false;
    render();
    schedule();
  }
}

document.addEventListener("visibilitychange", schedule);
window.addEventListener("online", () => {
  lastAttempt = -Infinity;
  schedule();
});
window.addEventListener("offline", () => {
  for (const row of rows) row.current = false;
  render();
});
amount.addEventListener("input", () => renderConverter());
unit.addEventListener("change", () => renderConverter());
render(true);
schedule();
