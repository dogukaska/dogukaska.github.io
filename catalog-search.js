const input = document.querySelector("#tool-search");
const groups = [...document.querySelectorAll("#grid section")];
const empty = document.querySelector("#no-tools");
const normalize = (text) => text.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i");
function filter() {
  const query = normalize(input.value).trim().split(/\s+/);
  let total = 0;
  for (const group of groups) {
    let count = 0;
    for (const entry of group.querySelectorAll("li")) {
      const keywords = normalize(entry.dataset.search);
      entry.hidden = !query.every((word) => keywords.includes(word));
      if (!entry.hidden) count++;
    }
    group.hidden = !count;
    total += count;
  }
  empty.hidden = total !== 0;
}
input.addEventListener("input", filter);
window.addEventListener("pageshow", filter);
filter();
