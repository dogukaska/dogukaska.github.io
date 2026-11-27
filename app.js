import { CATEGORIES } from "./apps.js?v=20261127i";
import { icon } from "./icons.js?v=20261126g";

const visiblePerCategory = 6;
const grid = document.getElementById("grid");
for (const category of CATEGORIES) {
  if (!category.apps.length) continue;
  const section = document.createElement("section");
  section.id = category.id;
  const heading = document.createElement("h2");
  heading.id = `category-${category.id}`;
  heading.textContent = category.name;
  section.setAttribute("aria-labelledby", heading.id);
  section.className = "category";
  const list = document.createElement("ul");
  list.className = "tool-list";
  list.id = "tools-" + category.id;
  list.setAttribute("role", "list");
  for (const app of category.apps) {
    const row = document.createElement("li");
    const link = document.createElement("a");
    link.className = "app";
    link.href = app.url;
    const glyph = document.createElement("span");
    glyph.className = "icon";
    glyph.innerHTML = icon(app.icon, 21);
    const details = document.createElement("span");
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = app.name;
    const description = document.createElement("span");
    description.className = "description";
    description.textContent = app.desc;
    details.append(label, description);
    link.append(glyph, details);
    row.dataset.search = [category.name, app.name, app.desc, app.terms].join(" ");
    if (list.children.length >= visiblePerCategory) {
      row.dataset.overflow = "";
      row.hidden = true;
    }
    row.append(link);
    list.append(row);
  }
  section.append(heading, list);
  if (category.apps.length > visiblePerCategory) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "category-more";
    more.textContent = "Diğer araçları gör";
    more.setAttribute("aria-expanded", "false");
    more.setAttribute("aria-controls", list.id);
    section.append(more);
  }
  grid.append(section);
}
