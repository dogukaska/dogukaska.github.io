const encoder = new TextEncoder();

function clean(raw) {
  const base = raw.split(/[\\/]/).at(-1)
    .replace(/[\u0000-\u001f\u007f-\u009f:*?"<>|]/gu, "_").trim().replace(/\.+$/, "");
  if (!base) return "dosya";
  return /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(base) ? "_" + base : base;
}

const key = name => name.normalize("NFC").toLowerCase();

export function entryNames(names) {
  const plain = names.map(clean);
  const occupied = new Set(plain.map(key));
  const seen = new Set();
  const nextOrdinal = new Map();
  return plain.map(name => {
    const match = key(name);
    if (!seen.has(match)) {
      seen.add(match);
      return name;
    }
    const dot = name.lastIndexOf(".");
    const extension = dot > 0 ? name.slice(dot) : "";
    const stem = dot > 0 ? name.slice(0, dot) : name;
    let ordinal = nextOrdinal.get(match) ?? 2;
    let alternate;
    do {
      alternate = stem + " (" + ordinal++ + ")" + extension;
    } while (occupied.has(key(alternate)));
    nextOrdinal.set(match, ordinal);
    occupied.add(key(alternate));
    return alternate;
  });
}

export function archiveName(raw) {
  return clean(raw.trim().replace(/\.zip$/i, "") || "dosyalar") + ".zip";
}

export function fitsClassicZip(files, names) {
  // The archive stores media unchanged and permits deflate to expand on text inputs.
  // Leave room for the entry headers, UTF-8 path fields and compression overhead.
  if (files.length >= 65_535) return false;
  return files.reduce((total, file, index) => {
    const pathBytes = encoder.encode(names[index]).length;
    return total + file.size + Math.ceil(file.size / 1024) * 16 + pathBytes * 4 + 96;
  }, 22) < 0xffffffff;
}
