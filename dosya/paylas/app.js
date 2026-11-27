import { LIMIT, MAX_FILES, fileUrl, originFor, request, uploadFile, validFile, validUploadId } from "./plik.js?v=1";

const element = (id) => document.getElementById(id);
const form = element("send-form");
const server = element("server");
const token = element("token");
const fileInput = element("files");
const progress = element("progress");
const sendStatus = element("send-status");
const receiveStatus = element("receive-status");
const historyPanel = element("history-panel");
const historyList = element("history");
const date = new Intl.DateTimeFormat("tr", { dateStyle: "medium", timeStyle: "short" });
const number = new Intl.NumberFormat("tr", { maximumFractionDigits: 1 });
const historyKey = "dk:plik:transfers";
let activeUpload;
let resultId;

function sizeText(bytes) {
  if (bytes >= 1e9) return `${number.format(bytes / 1e9)} GB`;
  if (bytes >= 1e6) return `${number.format(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${number.format(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Transfers still work with browser storage disabled.
  }
}

let history = read(historyKey, []);
if (!Array.isArray(history)) history = [];
history = history.filter((item) => item && validUploadId(item.id)
  && Date.parse(item.expireAt) > Date.now() && typeof item.origin === "string"
  && typeof item.count === "number");

function shareUrl(origin, id) {
  const url = new URL(location.pathname, location.origin);
  url.hash = new URLSearchParams({ sunucu: origin, gonderi: id }).toString();
  return url.href;
}

function renderHistory() {
  historyList.replaceChildren();
  historyPanel.hidden = history.length === 0;
  for (const item of history) {
    const row = document.createElement("li");
    const label = document.createElement("span");
    const link = document.createElement("a");
    const remove = document.createElement("button");
    link.href = shareUrl(item.origin, item.id);
    link.textContent = `${item.count} dosya · ${date.format(new Date(item.expireAt))}`;
    label.append(link);
    remove.type = "button";
    remove.textContent = "Sil";
    remove.setAttribute("aria-label", `Gönderiyi sil (${item.id.slice(-5)})`);
    remove.disabled = Boolean(activeUpload);
    remove.addEventListener("click", async () => {
      const apiKey = token.value.trim();
      try {
        if (!apiKey || originFor(server.value) !== item.origin) {
          throw new Error("Silmek için bu gönderinin sunucu adresini ve API anahtarını gir.");
        }
        if (!confirm("Bu gönderiyi silmek istiyor musun? Bağlantı artık çalışmayacak.")) return;
        remove.disabled = true;
        try {
          await request(item.origin, `/upload/${item.id}`, { method: "DELETE", token: apiKey });
        } catch (error) {
          if (error.status !== 404) throw error;
        }
        history = history.filter((entry) => entry.id !== item.id || entry.origin !== item.origin);
        save(historyKey, history);
        if (resultId === item.id) element("result").hidden = true;
        sendStatus.textContent = "Gönderi kaldırıldı.";
        renderHistory();
      } catch (error) {
        sendStatus.textContent = error.message;
        remove.disabled = false;
      }
    });
    row.append(label, remove);
    historyList.append(row);
  }
}

function selectFiles() {
  const files = Array.from(fileInput.files);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  element("selection").textContent = files.length
    ? `${files.length} dosya · ${sizeText(total)} / 15 GB`
    : "Gönderi başına toplam 15 GB";
  return { files, total };
}

function toggleUploading(busy) {
  for (const control of [server, token, fileInput, element("duration"), element("send")]) {
    control.disabled = busy;
  }
  element("cancel").hidden = !busy;
  element("cancel").disabled = false;
  progress.hidden = !busy;
  renderHistory();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (activeUpload) return;
  const { files, total } = selectFiles();
  const seconds = Number(element("duration").value) * 86400;
  let origin;
  let transfer;
  try {
    origin = originFor(server.value);
    if (total > LIMIT) throw new Error("Bir gönderide toplam en fazla 15 GB yükleyebilirsin.");
    if (!files.length || files.length > MAX_FILES) throw new Error("1 ile 1000 arasında dosya seç.");
    if (![259200, 604800].includes(seconds)) throw new Error("3 veya 7 günlük süreyi seç.");
  } catch (error) {
    sendStatus.textContent = error.message;
    return;
  }

  const apiKey = token.value.trim();
  if (!apiKey) {
    sendStatus.textContent = "Plik API anahtarını gir.";
    return;
  }
  const controller = new AbortController();
  const { signal } = controller;
  activeUpload = controller;
  toggleUploading(true);
  progress.removeAttribute("value");
  sendStatus.textContent = "Plik sunucusuna bağlanılıyor…";
  element("result").hidden = true;

  try {
    const config = await request(origin, "/config");
    signal.throwIfAborted();
    if (config.feature_authentication !== "forced") {
      throw new Error("Sunucuda yükleme için kimlik doğrulaması zorunlu olmalı.");
    }
    if (config.maxFileSize > 0 && files.some((file) => file.size > config.maxFileSize)) {
      throw new Error(`Bu sunucuda dosya başına sınır ${sizeText(config.maxFileSize)}.`);
    }

    transfer = await request(origin, "/upload", {
      method: "POST",
      token: apiKey,
      data: {
        ttl: seconds,
        files: files.map((file, index) => ({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
          reference: String(index),
        })),
      },
    });
    signal.throwIfAborted();
    const entries = new Map((transfer.files ?? []).map((entry) => [entry.reference, entry]));
    if (!validUploadId(transfer.id) || !transfer.uploadToken || entries.size !== files.length
      || !files.every((_, index) => validFile(entries.get(String(index))))
      || !Number.isFinite(Date.parse(transfer.expireAt)) || transfer.ttl !== seconds) {
      throw new Error("Plik süre veya dosya listesini doğrulayamadı.");
    }

    let sent = 0;
    for (const [index, file] of files.entries()) {
      progress.value = total ? sent / total * 100 : index / files.length * 100;
      sendStatus.textContent = `Yükleniyor · ${index + 1}/${files.length} · ${file.name}`;
      await uploadFile(origin, transfer, entries.get(String(index)), file, signal, (fraction) => {
        progress.value = total ? (sent + file.size * fraction) / total * 100 : (index + fraction) / files.length * 100;
      });
      sent += file.size;
    }
    signal.throwIfAborted();
    progress.value = 100;
    const link = shareUrl(origin, transfer.id);
    save("dk:plik:origin", origin);
    history.unshift({ origin, id: transfer.id, expireAt: transfer.expireAt, count: files.length });
    save(historyKey, history);
    resultId = transfer.id;
    element("share").value = link;
    element("preview").href = link;
    element("result").hidden = false;
    historyPanel.open = true;
    fileInput.value = "";
    selectFiles();
    sendStatus.textContent = `Bağlantı hazır. Son indirme ${date.format(new Date(transfer.expireAt))}.`;
  } catch (error) {
    let cleanup = "";
    if (validUploadId(transfer?.id) && transfer.uploadToken) {
      try {
        await request(origin, `/upload/${transfer.id}`, { method: "DELETE", uploadToken: transfer.uploadToken });
      } catch (cleanupError) {
        if (cleanupError.status !== 404) {
          cleanup = " Kısmi gönderi şu anda silinemedi. Plik süre sonunda temizler.";
          if (Number.isFinite(Date.parse(transfer.expireAt))) {
            history.unshift({ origin, id: transfer.id, expireAt: transfer.expireAt, count: files.length });
            save(historyKey, history);
          }
        }
      }
    }
    sendStatus.textContent = (signal.aborted ? "Yükleme iptal edildi." : error.message) + cleanup;
  } finally {
    activeUpload = undefined;
    toggleUploading(false);
  }
});

element("cancel").addEventListener("click", () => {
  if (!activeUpload) return;
  activeUpload.abort();
  element("cancel").disabled = true;
  sendStatus.textContent = "İptal ediliyor…";
});
element("copy").addEventListener("click", async () => {
  const share = element("share");
  try {
    await navigator.clipboard.writeText(share.value);
    sendStatus.textContent = "Bağlantı kopyalandı.";
  } catch {
    share.select();
    sendStatus.textContent = "Bağlantı seçildi. Kopyalayabilirsin.";
  }
});
fileInput.addEventListener("change", selectFiles);

const showFiles = element("show-files");
const downloads = element("downloads");
const zip = element("download-zip");

function openRoute() {
  const params = new URLSearchParams(location.hash.slice(1));
  const recipient = params.has("sunucu") || params.has("gonderi");
  element("sender").hidden = recipient;
  element("sender-intro").hidden = recipient;
  element("recipient").hidden = !recipient;
  downloads.hidden = true;
  downloads.replaceChildren();
  zip.hidden = true;
  receiveStatus.textContent = "";
  showFiles.hidden = true;
  showFiles.onclick = null;
  element("recipient-server").textContent = "";
  if (!recipient) return;

  const id = params.get("gonderi");
  let origin;
  try {
    origin = originFor(params.get("sunucu"));
    if (!validUploadId(id)) throw new Error("Bu paylaşım bağlantısı geçersiz.");
  } catch (error) {
    receiveStatus.textContent = error.message;
    return;
  }

  element("recipient-server").textContent = `Dosya sunucusu: ${new URL(origin).host}`;
  showFiles.hidden = false;
  showFiles.disabled = false;
  showFiles.onclick = async () => {
    const route = location.hash;
    showFiles.disabled = true;
    receiveStatus.textContent = "Dosyalar yükleniyor…";
    try {
      const transfer = await request(origin, `/upload/${id}`);
      if (route !== location.hash) return;
      const files = (transfer.files ?? []).filter((file) => validFile(file) && file.status === "uploaded");
      if (transfer.id !== id || !files.length) throw new Error("İndirilebilir dosya bulunamadı.");

      for (const file of files) {
        const row = document.createElement("li");
        const name = document.createElement("span");
        const link = document.createElement("a");
        name.textContent = `${file.fileName} · ${sizeText(file.fileSize)}`;
        link.href = `${fileUrl(origin, id, file)}?dl=1`;
        link.className = "button";
        link.textContent = "İndir";
        link.setAttribute("aria-label", `${file.fileName} dosyasını indir`);
        row.append(name, link);
        downloads.append(row);
      }

      zip.href = `${origin}/archive/${id}/dosyalar.zip?dl=1`;
      zip.hidden = files.length < 2;
      downloads.hidden = false;
      showFiles.hidden = true;
      const expiry = Date.parse(transfer.expireAt);
      receiveStatus.textContent = Number.isFinite(expiry) ? `Son indirme ${date.format(new Date(expiry))}.` : "";
    } catch (error) {
      if (route === location.hash) {
        receiveStatus.textContent = error.message;
        showFiles.disabled = false;
      }
    }
  };
}

server.value = read("dk:plik:origin", "");
renderHistory();
openRoute();
window.addEventListener("hashchange", openRoute);
