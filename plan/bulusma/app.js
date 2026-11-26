import { $, addDays, dateLabel, element, read, save, today } from "/gunluk/common.js?v=1";

const storageKey = "dijital-caki-bulusmalar-1";
const maxSlots = 60;
const idPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const slotPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const fallback = { polls: [], active: "" };
let state = read(storageKey, fallback);
let active = state.active;
let invitation;
let counter = 0;

function encode(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(hash) {
  const match = /^#(anket|yanit)=([\w-]{1,6000})$/.exec(hash);
  if (!match) return null;
  try {
    const binary = atob(match[2].replaceAll("-", "+").replaceAll("_", "/"));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    return { type: match[1], data };
  } catch { return null; }
}

function link(type, data) {
  const url = new URL(location.pathname, location.origin);
  url.hash = type + "=" + encode(data);
  return url.href;
}

function isPoll(poll) {
  return idPattern.test(poll?.id) && typeof poll?.title === "string" &&
    poll.title.trim().length > 0 && poll.title.length <= 100 && Array.isArray(poll.slots) &&
    poll.slots.length >= 2 && poll.slots.length <= maxSlots &&
    new Set(poll.slots).size === poll.slots.length &&
    poll.slots.every((slot) => typeof slot === "string" && slotPattern.test(slot) && Number.isFinite(Date.parse(slot + "+03:00")));
}

function isVote(vote, poll) {
  return idPattern.test(vote?.id) && vote.poll === poll.id && Number.isSafeInteger(vote.sent) &&
    typeof vote.name === "string" && vote.name.trim().length > 0 && vote.name.length <= 50 &&
    Array.isArray(vote.choices) && vote.choices.length <= poll.slots.length &&
    vote.choices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice < poll.slots.length);
}

function store(next) {
  if (!save(storageKey, next)) return false;
  state = next;
  return true;
}

function slotLabel(value) {
  return dateLabel(value.slice(0, 10)) + " · " + value.slice(11);
}

function formSlot(value = "") {
  if ($("options").children.length >= maxSlots) return;
  const id = "date-" + ++counter;
  const row = element("li", undefined, { class: "line" });
  const input = element("input", undefined, { id, type: "datetime-local", required: "", "aria-label": "Buluşma zamanı" });
  input.value = value;
  const remove = element("button", "Kaldır", { type: "button" });
  remove.addEventListener("click", () => {
    if ($("options").children.length <= 2) return;
    row.remove();
    updateButtons();
  });
  row.append(input, remove);
  $("options").append(row);
  updateButtons();
  return input;
}

function updateButtons() {
  const count = $("options").children.length;
  $("add-date").disabled = count >= maxSlots;
  for (const button of $("options").querySelectorAll("button")) button.disabled = count <= 2;
}

function pollOptions() {
  const options = state.polls.map(({ id, title }) => element("option", title, { value: id }));
  $("saved").replaceChildren(element("option", "Yeni anket", { value: "" }), ...options);
  $("saved").value = active;
}

function renderHost() {
  invitation = undefined;
  $("guest").hidden = true;
  $("saved-panel").hidden = !state.polls.length;
  pollOptions();
  const poll = state.polls.find(({ id }) => id === active);
  $("host").hidden = Boolean(poll);
  $("results").hidden = !poll;
  if (!poll) return;
  const { id, title, slots, votes } = poll;
  $("host-title").textContent = title;
  $("invite").value = link("anket", { id, title, slots });
  const tallies = slots.map((_, index) => votes.filter(({ choices }) => choices.includes(index)).length);
  const best = Math.max(...tallies);
  $("tally").replaceChildren(...slots.map((slot, index) => {
    const row = element("li", undefined, { class: "line" });
    row.append(element("span", slotLabel(slot)), element(tallies[index] === best && best ? "strong" : "span", tallies[index] + " uygun"));
    return row;
  }));
  $("respondents").replaceChildren(...votes.map(({ name, choices }) => element("li", name + " · " + (choices.length ? choices.length + " saat uygun" : "uygun saat yok"))));
  $("response-count").textContent = votes.length ? votes.length + " yanıt" : "Henüz yanıt yok.";
}

function importVote(hash) {
  const reply = decode(hash);
  const vote = reply?.data;
  const poll = state.polls.find(({ id }) => id === vote?.poll);
  if (reply?.type !== "yanit" || !poll || !isVote(vote, poll)) {
    $(active ? "host-status" : "status").textContent = poll ? "Yanıt bağlantısı geçersiz." :
      "Bu yanıt için anketin oluşturulduğu tarayıcıda bağlantıyı aç.";
    return;
  }
  active = poll.id;
  const previous = poll.votes.find(({ id }) => id === vote.id);
  if (previous && previous.sent >= vote.sent) {
    renderHost();
    $("host-status").textContent = "Bu yanıt zaten kayıtlı.";
    return;
  }
  const next = { active, polls: state.polls.map((entry) => entry === poll ? {
    ...entry, votes: [...entry.votes.filter(({ id }) => id !== vote.id), { ...vote, choices: [...new Set(vote.choices)] }],
  } : entry) };
  const stored = store(next);
  renderHost();
  $("host-status").textContent = stored ? vote.name + " için yanıt kaydedildi." : "Yanıt tarayıcıya kaydedilemedi.";
  return stored;
}

function showVote(poll) {
  invitation = poll;
  $("saved-panel").hidden = $("host").hidden = $("results").hidden = true;
  $("guest").hidden = false;
  $("reply-panel").hidden = true;
  $("vote-status").textContent = "";
  $("guest-title").textContent = poll.title;
  const saved = read(storageKey + "-vote-" + poll.id, {});
  $("voter").value = saved.name ?? "";
  $("choices").replaceChildren(...poll.slots.map((slot, index) => {
    const label = element("label", undefined, { class: "check" });
    const input = element("input", undefined, { type: "checkbox", value: index });
    input.checked = saved.choices?.includes(index) ?? false;
    label.append(input, element("span", slotLabel(slot)));
    return label;
  }));
}

function route() {
  const hash = location.hash;
  const decoded = decode(hash);
  if (decoded?.type === "anket" && isPoll(decoded.data)) {
    showVote(decoded.data);
    return;
  }
  renderHost();
  if (decoded?.type === "yanit") {
    if (importVote(hash)) history.replaceState(null, "", location.pathname);
  } else if (hash) {
    $(active ? "host-status" : "status").textContent = "Anket bağlantısı geçersiz.";
  }
}

async function share(id, title, statusId) {
  const field = $(id);
  if (navigator.share) {
    try {
      await navigator.share({ title, url: field.value });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(field.value);
    $(statusId).textContent = "Bağlantı kopyalandı. Mesajına yapıştırabilirsin.";
  } catch {
    field.focus();
    field.select();
    $(statusId).textContent = "Seçili bağlantıyı kopyalayıp mesajına ekle.";
  }
}

const first = today();
formSlot(first + "T18:00");
formSlot(addDays(first, 1) + "T18:00");
$("add-date").addEventListener("click", () => formSlot()?.focus());
$("poll-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const slots = Array.from($("options").querySelectorAll("input"), ({ value }) => value).sort();
  const poll = { id: crypto.randomUUID(), title: $("title").value.trim(), slots, votes: [] };
  if (!isPoll(poll)) {
    $("status").textContent = "Buluşma adı ve birbirinden farklı en az iki tarih seç.";
    return;
  }
  if (!store({ active: poll.id, polls: [...state.polls, poll] })) {
    $("status").textContent = "Anket tarayıcıya kaydedilemedi.";
    return;
  }
  active = poll.id;
  renderHost();
});
$("saved").addEventListener("change", () => {
  active = $("saved").value;
  store({ ...state, active });
  renderHost();
});
$("new-poll").addEventListener("click", () => {
  active = "";
  store({ ...state, active });
  renderHost();
  $("title").focus();
});
$("import-form").addEventListener("submit", (event) => {
  event.preventDefault();
  importVote(new URL($("reply-input").value).hash);
});
$("vote-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const key = storageKey + "-vote-" + invitation.id;
  const previous = read(key, {});
  const vote = {
    id: previous.id ?? crypto.randomUUID(),
    poll: invitation.id,
    sent: Math.max(Date.now(), (previous.sent || 0) + 1),
    name: $("voter").value.trim(),
    choices: [...$("choices").querySelectorAll("input:checked")].map((input) => Number(input.value)),
  };
  if (!isVote(vote, invitation)) {
    $("vote-status").textContent = "Bir ad veya takma ad gir.";
    return;
  }
  save(key, vote);
  $("reply").value = link("yanit", vote);
  $("reply-panel").hidden = false;
  $("vote-status").textContent = "Yanıt bağlantısını anketi gönderen kişiye geri gönder.";
});
$("share-invite").addEventListener("click", () => share("invite", "Buluşma anketi", "host-status"));
$("share-reply").addEventListener("click", () => share("reply", "Buluşma yanıtı", "vote-status"));
window.addEventListener("hashchange", route);
route();
