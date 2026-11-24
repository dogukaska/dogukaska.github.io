import { APPS } from "./apps.js";

const grid = document.getElementById("grid");
for (const a of APPS) {
  const el = document.createElement("a");
  el.className = "app";
  el.href = a.url;
  el.title = a.desc || a.name;
  const icon = document.createElement("span");
  icon.className = "icon";
  icon.style.background = `linear-gradient(160deg, ${a.colors[0]}, ${a.colors[1]})`;
  icon.textContent = a.emoji;
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = a.name;
  const desc = document.createElement("span");
  desc.className = "desc";
  desc.textContent = a.desc || "";
  el.append(icon, label, desc);
  grid.append(el);
}

document.getElementById("today").textContent = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

// Ana ekrana ekleme ipucu (yalnızca tarayıcıda açıkken)
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (!standalone) {
  const tip = document.getElementById("install-tip");
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const android = /Android/.test(navigator.userAgent);
  if (ios) tip.textContent = "Telefonda uygulama gibi açmak için: Paylaş düğmesi → “Ana Ekrana Ekle”.";
  else if (android) tip.textContent = "Telefonda uygulama gibi açmak için: sağ üstteki ⋮ menü → “Ana ekrana ekle”.";
  if (tip.textContent) tip.classList.remove("hidden");
}
