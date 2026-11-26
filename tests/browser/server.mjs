import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const applications = new Set(["belge", "ev", "foto", "metin-veri", "pdf-epub", "plan", "qr", "video"]);
const appsRoot = resolve(process.env.DK_APPS_ROOT || "..");
const hub = resolve(".");
const mime = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".mjs": "text/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

for (const app of applications) {
  const entry = resolve(appsRoot, app, "index.html");
  if (!await stat(entry).catch(() => null)) {
    throw new Error(`Uygulama bulunamadı: ${entry}. DK_APPS_ROOT değerini kontrol et.`);
  }
}

createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const parts = path.split("/").filter(Boolean);
    const root = applications.has(parts[0]) ? resolve(appsRoot, parts.shift()) : hub;
    if (path.endsWith("/")) parts.push("index.html");
    const file = resolve(root, ...parts);
    const info = file.startsWith(root + sep) ? await stat(file).catch(() => null) : null;
    if (!info?.isFile()) return response.writeHead(404).end();
    response.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Content-Length": info.size,
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(400).end();
  }
}).listen(Number(process.env.DK_TEST_PORT || 4173), "127.0.0.1");
