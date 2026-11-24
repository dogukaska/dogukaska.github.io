import { APPS } from "./apps.js";
import { icon } from "./icons.js";

const grid = document.getElementById("grid");
for (const a of APPS) {
  const el = document.createElement("a");
  el.className = "app";
  el.href = a.url;
  el.title = a.desc || a.name;
  const tile = document.createElement("span");
  tile.className = "icon glass";
  tile.innerHTML = icon(a.icon, 30);
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = a.name;
  el.append(tile, label);
  grid.append(el);
}

document.getElementById("today").textContent = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

// Ana ekrana ekleme ipucu (yalnızca tarayıcıda açıkken)
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (!standalone) {
  const tip = document.getElementById("install-tip");
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const android = /Android/.test(navigator.userAgent);
  if (ios) tip.textContent = "Uygulama gibi açmak için: Paylaş → “Ana Ekrana Ekle”.";
  else if (android) tip.textContent = "Uygulama gibi açmak için: ⋮ menü → “Ana ekrana ekle”.";
  if (tip.textContent) tip.classList.remove("hidden");
}
