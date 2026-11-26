const input = document.querySelector("#tool-search");
const groups = [...document.querySelectorAll("#grid section")];
const empty = document.querySelector("#no-tools");
const normalize = (text) => text.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i");
input.addEventListener("input", () => {
  const query = normalize(input.value).trim().split(/\s+/);
  let total = 0;
  for (const group of groups) {
    let count = 0;
    for (const entry of group.querySelectorAll("li")) {
      const keywords = normalize(group.querySelector("h2").textContent + " " + entry.textContent);
      entry.hidden = !query.every((word) => keywords.includes(word));
      if (!entry.hidden) count++;
    }
    group.hidden = !count;
    total += count;
  }
  empty.hidden = total !== 0;
});
