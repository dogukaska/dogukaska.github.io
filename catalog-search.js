const toggle = document.querySelector("#search-toggle");
const panel = document.querySelector("#catalog-search");
const input = document.querySelector("#tool-search");
const groups = [...document.querySelectorAll("#grid section")];
const empty = document.querySelector("#no-tools");
const normalize = (text) => text.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i");
function filter() {
  const text = normalize(panel.hidden ? "" : input.value).trim();
  const query = text.split(/\s+/);
  let total = 0;
  for (const group of groups) {
    let count = 0;
    const more = group.querySelector(".category-more");
    const expanded = more?.getAttribute("aria-expanded") === "true";
    if (more) more.hidden = Boolean(text);
    for (const entry of group.querySelectorAll("[data-search]")) {
      const keywords = normalize(entry.dataset.search);
      entry.hidden = text ? !query.every((word) => keywords.includes(word)) : entry.hasAttribute("data-overflow") && !expanded;
      if (!entry.hidden) count++;
    }
    group.hidden = !count;
    total += count;
  }
  empty.hidden = total !== 0;
}

function setExpanded(expanded) {
  panel.hidden = !expanded;
  toggle.setAttribute("aria-expanded", String(expanded));
  if (expanded) {
    input.focus();
  } else {
    input.value = "";
    toggle.focus();
  }
  filter();
}

toggle.addEventListener("click", () => setExpanded(panel.hidden));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.isComposing || panel.hidden) return;
  event.preventDefault();
  setExpanded(false);
});
for (const group of groups) {
  const more = group.querySelector(".category-more");
  more?.addEventListener("click", () => {
    const open = more.getAttribute("aria-expanded") === "false";
    more.setAttribute("aria-expanded", String(open));
    more.textContent = open ? "Daha az göster" : "Diğer araçları gör";
    filter();
    if (open) group.querySelector(".tool-list li:nth-child(7) .app")?.focus({ preventScroll: true });
  });
}
input.addEventListener("input", filter);
window.addEventListener("pageshow", filter);
toggle.hidden = false;
filter();
