import { APPS } from "./apps.js?v=20261125e";
import { icon } from "./icons.js?v=20261125e";

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
