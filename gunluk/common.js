export const $ = (id) => document.getElementById(id);

export function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

export function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = element("a", undefined, { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function today() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(Date.now());
}

export function dateLabel(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium", timeZone: "UTC"
  }).format(new Date(date + "T00:00:00Z"));
}

export function addDays(date, days) {
  const timestamp = Date.parse(date + "T00:00:00Z");
  return new Date(timestamp + days * 86_400_000).toISOString().slice(0, 10);
}
