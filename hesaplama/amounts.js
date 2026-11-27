const grouped = /^(?:[1-9]\d{0,2})(?:\.\d{3})+$/;
const decimal = /^[+-]?\d+(?:[.,]\d+)?$/;

function normalise(value) {
  const input = String(value ?? "").trim().replace("−", "-");
  const sign = /^[+-]/.test(input) ? input[0] : "";
  const unsigned = input.slice(sign.length);
  const [whole, fraction, extra] = unsigned.split(",");
  if (extra === undefined && grouped.test(whole) && (fraction === undefined || /^\d+$/.test(fraction))) {
    return sign + whole.replaceAll(".", "") + (fraction === undefined ? "" : "." + fraction);
  }
  if (!decimal.test(input)) throw new RangeError("Geçerli bir sayı gir. Ondalık için virgül kullanabilirsin.");
  return input.replace(",", ".");
}

function fraction(value) {
  const [whole, tail = ""] = normalise(value).split(".");
  const scale = 10n ** BigInt(tail.length);
  const units = BigInt(whole + tail);
  return { units, scale };
}

function requireMinimum(value, minimum, message) {
  if (value < minimum) throw new RangeError(message);
  return value;
}

function roundDivide(value, divisor) {
  if (divisor <= 0n) throw new RangeError("Bölen sıfırdan büyük olmalı.");
  if (value < 0n) return -roundDivide(-value, divisor);
  return (value + divisor / 2n) / divisor;
}

export function number(value) {
  const result = Number(normalise(value));
  if (!Number.isFinite(result)) throw new RangeError("Hesaplanabilir bir sayı gir.");
  return result;
}

export function money(value) {
  const { units, scale } = fraction(value);
  if (units < 0n) throw new RangeError("Tutar negatif olamaz.");
  if (units * 100n % scale !== 0n) throw new RangeError("Tutarı en çok iki ondalık basamakla gir.");
  return units * 100n / scale;
}

function rate(value, capped = false) {
  const { units, scale } = fraction(value);
  const base = scale * 100n;
  if (units < 0n || (capped && units > base)) {
    throw new RangeError(capped ? "Oran %0 ile %100 arasında olmalı." : "Oran negatif olamaz.");
  }
  return { units, base };
}

export function changeAmount(amount, percent, direction) {
  const { units, base } = rate(percent, direction === -1);
  const total = roundDivide(amount * (base + BigInt(direction) * units), base);
  return { difference: (total - amount) * BigInt(direction), total };
}

export function originalAmount(total, percent, direction) {
  const { units, base } = rate(percent, direction === -1);
  const multiplier = base + BigInt(direction) * units;
  if (multiplier === 0n) throw new RangeError("%100 indirimden önceki tutar hesaplanamaz.");
  return roundDivide(total * base, multiplier);
}

export function changeRate(from, to, direction) {
  if (from === 0n) throw new RangeError("Başlangıç tutarı sıfırdan büyük olmalı.");
  const difference = (to - from) * BigInt(direction);
  requireMinimum(difference, 0n, direction === 1
    ? "Yeni tutar eski tutardan düşük olamaz."
    : "İndirimli tutar ilk tutardan yüksek olamaz.");
  return { difference, percent: Number(difference) / Number(from) * 100 };
}

export function percentage(mode, a, b) {
  if (mode === "part") return a * (b / 100);
  if (mode === "ratio") {
    if (b === 0) throw new RangeError("Bütün sıfır olamaz.");
    return a / b * 100;
  }
  if (a === 0) throw new RangeError("Başlangıç değeri sıfır olamaz.");
  return (b - a) / Math.abs(a) * 100;
}

export function proportion(a, b, c) {
  if (a === 0) throw new RangeError("İlk değer sıfır olamaz.");
  return b / a * c;
}

export function vat(amount, percent, mode) {
  const { units, base } = rate(percent);
  if (mode === "net") {
    const tax = roundDivide(amount * units, base);
    return { net: amount, tax, gross: amount + tax };
  }
  if (mode === "gross") {
    const net = roundDivide(amount * base, base + units);
    return { net, tax: amount - net, gross: amount };
  }
  if (units === 0n) throw new RangeError("KDV tutarından matrahı bulmak için oran sıfırdan büyük olmalı.");
  const net = roundDivide(amount * base, units);
  return { net, tax: amount, gross: net + amount };
}

export function splitBill(amount, percent, people) {
  if (!Number.isSafeInteger(people) || people < 1) throw new RangeError("Kişi sayısını pozitif tam sayı gir.");
  const { difference: tip, total } = changeAmount(amount, percent, 1);
  return { tip, total, baseShare: total / BigInt(people), extraPeople: Number(total % BigInt(people)) };
}

function quantity(input) {
  const value = fraction(input);
  requireMinimum(value.units, 1n, "Miktar sıfırdan büyük olmalı.");
  return value;
}

export function comparePrices(first, firstAmount, second, secondAmount) {
  const a = quantity(firstAmount);
  const b = quantity(secondAmount);
  const numeratorA = first * a.scale;
  const numeratorB = second * b.scale;
  const delta = numeratorA * b.units - numeratorB * a.units;
  return {
    first: roundDivide(numeratorA * 100n, a.units),
    second: roundDivide(numeratorB * 100n, b.units),
    cheaper: delta === 0n ? 0 : delta < 0n ? 1 : 2,
  };
}

export function fuelCost(distance, consumption, price) {
  const km = fraction(distance);
  const average = fraction(consumption);
  if (km.units < 0n || average.units < 0n) throw new RangeError("Mesafe ve tüketim negatif olamaz.");
  const numerator = km.units * average.units;
  const denominator = km.scale * average.scale * 100n;
  return {
    litres: Number(numerator) / Number(denominator),
    total: roundDivide(price * numerator, denominator),
    perKm: roundDivide(price * average.units * 100n, average.scale * 100n),
  };
}
