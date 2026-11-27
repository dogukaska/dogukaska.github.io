export const LIMIT = 15_000_000_000;
export const MAX_FILES = 1000;

export function originFor(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Geçerli bir Plik sunucu adresi gir.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:" && location.protocol === "http:")) {
    throw new Error("Plik sunucusunun HTTPS adresini gir.");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Plik sunucusunun yalnızca kök adresini gir.");
  }
  return url.origin;
}

export function validUploadId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9]{16}$/.test(id);
}

export function validFile(file) {
  return file && typeof file.id === "string" && /^[a-zA-Z0-9]{16}$/.test(file.id)
    && typeof file.fileName === "string" && file.fileName.length > 0
    && ![".", ".."].includes(file.fileName) && !/[\\/]/.test(file.fileName);
}

function responseError(status) {
  const messages = {
    400: "Plik gönderiyi kabul etmedi. Süreyi ve sunucu sınırlarını kontrol et.",
    401: "Bu işlem için geçerli bir Plik API anahtarı gerekiyor.",
    403: "Plik bu işleme izin vermedi. Anahtarı ve sunucu ayarlarını kontrol et.",
    404: "Gönderi silinmiş, süresi dolmuş veya bağlantı geçersiz.",
    413: "Dosya Plik sunucusunun boyut sınırını aşıyor.",
    429: "Plik kota sınırına ulaştı. Bir süre sonra tekrar dene.",
    507: "Plik sunucusunda yeterli alan yok.",
  };
  return Object.assign(new Error(messages[status] ?? `Plik isteği tamamlayamadı (HTTP ${status}).`), { status });
}

export async function request(origin, path, { method = "GET", token, uploadToken, data } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers["X-PlikToken"] = token;
  if (uploadToken) headers["X-UploadToken"] = uploadToken;
  if (data) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(origin + path, {
      method, headers, body: data ? JSON.stringify(data) : undefined,
      credentials: "omit", redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error("Plik sunucusuna ulaşılamadı. Bağlantıyı, HTTPS adresini ve sunucunun erişim ayarlarını kontrol et.");
  }
  if (!response.ok) throw responseError(response.status);
  if (method === "DELETE") return;
  try {
    return await response.json();
  } catch {
    throw new Error("Sunucu geçerli bir Plik yanıtı göndermedi.");
  }
}

export function fileUrl(origin, uploadId, file) {
  return `${origin}/file/${uploadId}/${file.id}/${encodeURIComponent(file.fileName)}`;
}

export function uploadFile(origin, transfer, entry, file, signal, onProgress) {
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const form = new FormData();
    form.append("file", file, entry.fileName);

    xhr.open("POST", fileUrl(origin, transfer.id, entry));
    xhr.setRequestHeader("X-UploadToken", transfer.uploadToken);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(responseError(xhr.status));
    });
    xhr.addEventListener("error", () => reject(new Error("Yükleme sırasında Plik bağlantısı kesildi.")));
    xhr.addEventListener("abort", () => reject(signal.reason));
    xhr.addEventListener("loadend", () => signal.removeEventListener("abort", abort));
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(form);
  });
}
