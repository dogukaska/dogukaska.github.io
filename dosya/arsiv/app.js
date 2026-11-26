import { $, download, element } from "/gunluk/common.js?v=1";

const picker = $("archive-file");
const status = $("status");
const files = $("files");
const reopen = $("reopen");
const maxFileSize = 128 * 1024 * 1024;
const sizeFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
let archive;
let busy = false;

function setBusy(value) {
  busy = value;
  picker.disabled = value;
  reopen.disabled = value;
  for (const button of files.querySelectorAll("button")) {
    button.disabled = value || button.dataset.tooLarge === "true";
  }
}

async function open() {
  const file = picker.files[0];
  if (busy || !file) return;
  setBusy(true);
  files.replaceChildren();
  $("entries").hidden = true;
  status.textContent = "Arşiv okunuyor…";
  try {
    await archive?.close();
    archive = undefined;
    if (file.size > maxFileSize) {
      status.textContent = "Bu tarayıcıda en fazla 128 MB boyutunda arşiv açılabilir.";
      return;
    }
    const { Archive } = await import("./vendor/libarchive.js");
    archive = await Archive.open(file);
    const password = $("password").value;
    if (password) await archive.usePassword(password);
    const entries = await archive.getFilesArray();
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      if (!entry.file?.name || entry.file.type === "directory") continue;
      const label = element("span", entry.path + entry.file.name);
      if (Number.isFinite(entry.file.size)) {
        label.append(element("small", " · " + sizeFormat.format(entry.file.size / 1024) + " KB", { class: "muted" }));
      }
      const row = element("li", undefined, { class: "line" });
      const button = element("button", "Çıkar", { type: "button", "aria-label": entry.file.name + " dosyasını çıkar" });
      const tooLarge = entry.file.size > maxFileSize;
      button.dataset.tooLarge = String(tooLarge);
      if (tooLarge) button.title = "Dosya 128 MB sınırını aşıyor";
      button.addEventListener("click", () => extract(entry.file));
      row.append(label, button);
      fragment.append(row);
    }
    files.append(fragment);
    $("entries").hidden = !files.childElementCount;
    status.textContent = files.childElementCount ? files.childElementCount + " dosya bulundu." : "Arşivde çıkarılacak dosya bulunamadı.";
  } catch {
    status.textContent = "Arşiv açılamadı. Biçimi ve varsa parolayı kontrol et.";
  } finally {
    setBusy(false);
  }
}

async function extract(entry) {
  if (busy) return;
  setBusy(true);
  status.textContent = "Dosya çıkarılıyor…";
  try {
    const file = await entry.extract();
    if (!file || file.size > maxFileSize) throw new Error();
    download(file, file.name.split(/[\\/]/).pop() || "dosya");
    status.textContent = "Dosya indirilmeye hazır.";
  } catch {
    status.textContent = "Dosya çıkarılamadı. Arşiv şifreliyse parolayla tekrar aç.";
  } finally {
    setBusy(false);
  }
}

picker.addEventListener("change", open);
reopen.addEventListener("click", open);
