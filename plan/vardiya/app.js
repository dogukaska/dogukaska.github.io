import ICAL from "./vendor/ical.min.js";
import { $, addDays, dateLabel, download, element, read, save, today } from "/gunluk/common.js?v=1";

const kinds = { G: "Gündüz", N: "Gece", "İ": "İzin" };
const storageKey = "dijital-caki-vardiya-1";
const saved = read(storageKey, {});
const scheduleId = saved.scheduleId ?? crypto.randomUUID();
const overrides = new Map(saved.overrides ?? []);
const ids = ["start", "days", "cycle", "day-start", "day-end", "night-start", "night-end"];
const status = $("status");
let plan = [];
$("start").value = today();
for (const id of ids) if (saved.fields?.[id]) $(id).value = saved.fields[id];
save(storageKey, { ...saved, scheduleId });

function type(value) {
  return value === "I" ? "İ" : value;
}

function shiftTimes(kind) {
  const prefix = kind === "G" ? "day" : "night";
  return [$(prefix + "-start").value, $(prefix + "-end").value];
}

function schedule() {
  const start = $("start").value;
  const days = $("days").valueAsNumber;
  const cycle = $("cycle").value.toLocaleUpperCase("tr").trim().split(/[\s,;]+/).map(type);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(start) && days >= 1 && days <= 366 &&
    cycle.every((kind) => Object.hasOwn(kinds, kind)) &&
    ["G", "N"].every((kind) => {
      const [from, to] = shiftTimes(kind);
      return from && to && from !== to;
    });
  plan = [];
  if (valid) {
    plan = Array.from({ length: days }, (_, index) => {
      const date = addDays(start, index);
      return { date, kind: overrides.get(date) ?? cycle[index % cycle.length] };
    });
  }
  const preview = $("preview");
  preview.replaceChildren(...plan.map(({ date, kind }) => {
    const [from, to] = shiftTimes(kind);
    const label = element("label", dateLabel(date) + (kind !== "İ" ? " · " + from + "–" + to : ""), { for: "s-" + date });
    const select = element("select", undefined, { id: "s-" + date, "aria-label": dateLabel(date) + " vardiyası" });
    for (const [key, name] of Object.entries(kinds)) select.append(element("option", name, { value: key }));
    select.value = kind;
    select.addEventListener("change", () => {
      overrides.set(date, select.value);
      updateSchedule();
      document.getElementById(select.id)?.focus({ preventScroll: true });
    });
    const row = element("li", undefined, { class: "line" });
    row.append(label, select);
    return row;
  }));
  $("export").disabled = !valid || !plan.some(({ kind }) => kind !== "İ");
  status.textContent = valid ? "" : "Başlangıcı, döngüyü ve vardiya saatlerini kontrol et.";
}

function calendarTime(date, time) {
  return ICAL.Time.fromJSDate(new Date(date + "T" + time + ":00+03:00"), true);
}

function updateSchedule() {
  schedule();
  if (!plan.length) return;
  const fields = Object.fromEntries(ids.map((id) => [id, $(id).value]));
  save(storageKey, { fields, scheduleId, overrides: [...overrides] });
}

for (const id of ids) $(id).addEventListener("input", updateSchedule);
$("export").addEventListener("click", () => {
  const calendar = new ICAL.Component("vcalendar");
  calendar.addPropertyWithValue("version", "2.0");
  calendar.addPropertyWithValue("prodid", "-//Dijital Çakı//Vardiya Takvimi//TR");
  calendar.addPropertyWithValue("calscale", "GREGORIAN");
  const timestamp = ICAL.Time.fromJSDate(new Date(), true);
  for (const { date, kind } of plan) {
    if (kind === "İ") continue;
    const [from, to] = shiftTimes(kind);
    const event = new ICAL.Component("vevent");
    event.addPropertyWithValue("uid", date + "-" + scheduleId + "@dogukaska.github.io");
    event.addPropertyWithValue("dtstamp", timestamp);
    event.addPropertyWithValue("dtstart", calendarTime(date, from));
    event.addPropertyWithValue("dtend", calendarTime(from > to ? addDays(date, 1) : date, to));
    event.addPropertyWithValue("summary", kinds[kind] + " vardiyası");
    calendar.addSubcomponent(event);
  }
  download(new Blob([calendar.toString() + "\r\n"], { type: "text/calendar;charset=utf-8" }), "vardiyalar.ics");
  status.textContent = "Takvim dosyası hazır.";
});
schedule();
