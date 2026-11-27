import { $, element } from "/gunluk/common.js?v=1";
import { tools } from "./tools.js?v=1";

const form = $("calculator");
const mode = $("mode");
const selected = new URLSearchParams(location.search).get("arac");
const tool = tools.find(({ id }) => id === selected);

function option(value, label) {
  return element("option", label, { value });
}

function makeField(definition) {
  const { name, label, type = "text", kind = "decimal", options, placeholder, initial } = definition;
  const id = "field-" + name;
  const control = type === "select" ? element("select") : element("input", undefined, { type });
  control.name = name;
  control.id = id;
  const caption = element("label", label, { for: id });
  if (type === "checkbox") {
    const wrapper = element("div", undefined, { class: "row check-row" });
    wrapper.append(control, caption);
    return wrapper;
  }
  control.required = true;
  if (type === "select") control.replaceChildren(...options.map(([value, text]) => option(value, text)));
  if (type === "text") {
    if (name !== "days") control.inputMode = kind === "integer" ? "numeric" : "decimal";
    control.maxLength = 40;
    control.autocomplete = "off";
    if (placeholder) control.placeholder = placeholder;
  }
  if (initial !== undefined) control.defaultValue = typeof initial === "function" ? initial() : initial;
  const wrapper = element("div", undefined, { class: "field" });
  wrapper.append(caption, control);
  return wrapper;
}

function clearFeedback() {
  $("error").textContent = "";
  $("result").replaceChildren();
}

if (tool) {
  const current = () => tool.modes ? tool.modes.find(({ id }) => id === mode.value) : tool;
  function renderFields() {
    const config = current();
    $("fields").replaceChildren(...config.fields.map(makeField));
    const acceptsDecimal = config.fields.some(({ type, kind }) => !type && kind !== "integer");
    const note = config.note || tool.note;
    const decimalHint = acceptsDecimal ? "Ondalık sayılarda virgül kullanabilirsin." : "";
    $("hint").textContent = [note, decimalHint].filter(Boolean).join(" ");
    $("hint").hidden = !$("hint").textContent;
    clearFeedback();
  }

  document.title = tool.name + " · Dijital Çakı";
  $("title").textContent = tool.name;
  $("description").textContent = tool.desc + ".";
  $("back").href = "./";
  $("back").textContent = "Hesaplama araçları";
  form.hidden = false;
  if (tool.modes) {
    mode.replaceChildren(...tool.modes.map(({ id, label }) => option(id, label)));
    $("mode-field").hidden = false;
    mode.addEventListener("change", renderFields);
  }
  form.addEventListener("input", clearFeedback);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearFeedback();
    try {
      const rows = current().calculate(Object.fromEntries(new FormData(form)));
      const list = element("dl", undefined, { class: "results" });
      for (const { label, value } of rows) {
        const item = element("div", undefined, { class: "result-row" });
        item.append(element("dt", label), element("dd", value));
        list.append(item);
      }
      $("result").replaceChildren(element("h2", "Sonuç"), list);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      $("error").textContent = error.message;
    }
  });
  form.addEventListener("reset", () => setTimeout(renderFields, 0));
  renderFields();
} else {
  const links = $("list");
  links.className = "calculator-list";
  links.replaceChildren(...tools.map(({ id, name, desc }) => {
    const link = element("a", undefined, { href: "?arac=" + id, class: "button" });
    link.append(element("span", name), element("span", desc, { class: "summary" }));
    return link;
  }));
  links.hidden = false;
}
