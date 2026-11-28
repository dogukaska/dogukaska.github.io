import { $, download, element } from "/gunluk/common.js?v=1";
import { archiveName, entryNames, fitsClassicZip } from "./names.js?v=1";

const fileInput = $("zip-files");
const name = $("zip-name");
const form = $("zip-form");
const list = $("zip-list");
const run = $("zip-run");
const progress = $("zip-progress");
const status = $("zip-status");

const number = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const alreadyCompressed = /\.(?:7z|aac|avif|bz2|docx|flac|gif|gz|heic|heif|jpe?g|m4a|mkv|mov|mp[34]|ogg|pdf|png|pptx|rar|webm|webp|xlsx|xz|zip)$/i;
const files = [];
let busy = false;
let zipModule;

function loadZip() {
  zipModule ??= new Promise((resolve, reject) => {
    const script = element("script", undefined, { src: "/pdf-epub/vendor/jszip.min.js" });
    script.onload = () => {
      script.remove();
      if (window.JSZip) resolve(window.JSZip);
      else reject(new Error("ZIP kitaplığı açılamadı."));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("ZIP kitaplığı yüklenemedi. Yeniden dene."));
    };
    document.head.append(script);
  }).catch(error => {
    zipModule = undefined;
    throw error;
  });
  return zipModule;
}

function render() {
  const names = entryNames(files.map(file => file.name));
  const total = files.reduce((sum, file) => sum + file.size, 0);
  $("zip-size").textContent = files.length
    ? files.length + " dosya · " + number.format(total / (1024 * 1024)) + " MB"
    : "";
  const entries = names.map((label, index) => {
    const row = element("li", undefined, { class: "line" });
    const remove = element("button", "Kaldır", { type: "button", "aria-label": label + " dosyasını kaldır" });
    remove.disabled = busy;
    remove.addEventListener("click", () => {
      files.splice(index, 1);
      status.textContent = "";
      render();
      fileInput.focus();
    });
    row.append(element("span", label), remove);
    return row;
  });
  list.replaceChildren(...entries);
  run.disabled = busy || !files.length;
  fileInput.disabled = name.disabled = busy;
  return names;
}

fileInput.addEventListener("change", () => {
  for (const file of fileInput.files) files.push(file);
  fileInput.value = "";
  status.textContent = "";
  render();
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy || !files.length) return;
  busy = true;
  const names = render();
  status.textContent = "ZIP hazırlanıyor…";
  progress.hidden = false;
  progress.value = 0;
  try {
    if (!fitsClassicZip(files, names)) throw new Error("Dosyalar tek bir ZIP için fazla büyük. Daha küçük gruplara ayırabilirsin.");
    const JSZip = await loadZip();
    const zip = new JSZip();
    for (const [index, file] of files.entries()) {
      zip.file(names[index], file, {
        compression: alreadyCompressed.test(file.name) ? "STORE" : "DEFLATE",
        date: file.lastModified ? new Date(file.lastModified) : undefined,
      });
    }
    const blob = await zip.generateAsync({ type: "blob", streamFiles: true }, ({ percent }) => { progress.value = percent; });
    download(blob, archiveName(name.value));
    status.textContent = "ZIP hazır.";
  } catch (error) {
    status.textContent = error.message || "ZIP oluşturulamadı.";
  } finally {
    busy = false;
    progress.hidden = true;
    render();
  }
});
